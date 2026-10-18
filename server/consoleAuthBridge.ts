import crypto from 'node:crypto';
import type { FoundryAuthCredentials } from './foundryProxy.ts';

interface PkceSession {
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  createdAt: number;
}

const pkceSessions = new Map<string, PkceSession>();
const registeredClientsByRedirectUri = new Map<string, string>();

// Pre-seeded production client_id registered on https://arctracker.io/api/auth/oauth2/register
registeredClientsByRedirectUri.set(
  'https://arc-mobile.salmondesert-a686da9c.swedencentral.azurecontainerapps.io/api/auth/arctracker/callback',
  'nBBpQpEITnFyUutiwajTQQMXQqqZMrzD'
);

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function getOrRegisterArcTrackerClientId(redirectUri: string): Promise<string> {
  const cached = registeredClientsByRedirectUri.get(redirectUri);
  if (cached) {
    return cached;
  }

  const isLoopback =
    redirectUri.startsWith('http://127.0.0.1') ||
    redirectUri.startsWith('http://localhost');

  const regRes = await fetch('https://arctracker.io/api/auth/oauth2/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)',
    },
    body: JSON.stringify({
      client_name: 'ARC Raiders Mobile Companion (PS5 & Console)',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: isLoopback ? 'native' : 'web',
      scope: 'game:read progress:read inventory:read progress:write offline_access',
    }),
  });

  if (!regRes.ok) {
    const errText = await regRes.text();
    throw new Error(`ARC Tracker OAuth client registration failed (${regRes.status}): ${errText}`);
  }

  const regJson = (await regRes.json()) as { client_id: string };
  registeredClientsByRedirectUri.set(redirectUri, regJson.client_id);
  return regJson.client_id;
}

/**
 * Starts a 1-click OAuth2 PKCE authorization flow with https://arctracker.io
 */
export async function startArcTrackerOAuthFlow(originUrl: string): Promise<string> {
  const cleanOrigin = originUrl.replace(/\/+$/, '');
  const redirectUri = `${cleanOrigin}/api/auth/arctracker/callback`;
  const clientId = await getOrRegisterArcTrackerClientId(redirectUri);

  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
  const state = base64UrlEncode(crypto.randomBytes(18));

  pkceSessions.set(state, {
    codeVerifier,
    redirectUri,
    clientId,
    createdAt: Date.now(),
  });

  const scope = 'game:read progress:read inventory:read progress:write offline_access';
  const authorizeUrl =
    `https://arctracker.io/api/auth/oauth2/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  const authRes = await fetch(authorizeUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)' },
  });

  const locHeader = authRes.headers.get('location');
  if (locHeader) {
    return locHeader.startsWith('http') ? locHeader : `https://arctracker.io${locHeader}`;
  }

  const bodyText = await authRes.text();
  try {
    const parsed = JSON.parse(bodyText) as { redirect?: boolean; url?: string };
    if (parsed.url) {
      return parsed.url.startsWith('http')
        ? parsed.url
        : `https://arctracker.io${parsed.url}`;
    }
  } catch {
    // Fallback to direct authorizeUrl
  }

  return authorizeUrl;
}

/**
 * Completes the OAuth2 PKCE callback from https://arctracker.io and returns the redirect URL back to the app.
 */
export async function completeArcTrackerOAuthCallback(
  queryParams: URLSearchParams
): Promise<{ redirectUrl: string; ok: boolean; error?: string }> {
  const code = queryParams.get('code');
  const state = queryParams.get('state');
  const error = queryParams.get('error');

  if (error) {
    return {
      ok: false,
      error,
      redirectUrl: `/?authError=${encodeURIComponent(error)}`,
    };
  }

  if (!code || !state) {
    return {
      ok: false,
      error: 'Missing OAuth code or state',
      redirectUrl: '/?authError=missing_code_or_state',
    };
  }

  const session = pkceSessions.get(state);
  pkceSessions.delete(state);

  if (!session) {
    return {
      ok: false,
      error: 'Expired or invalid OAuth state',
      redirectUrl: '/?authError=invalid_state',
    };
  }

  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: session.clientId,
    code,
    redirect_uri: session.redirectUri,
    code_verifier: session.codeVerifier,
  });

  const tokenRes = await fetch('https://arctracker.io/api/auth/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: form.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return {
      ok: false,
      error: `Token exchange failed (${tokenRes.status}): ${errText.slice(0, 160)}`,
      redirectUrl: `/?authError=${encodeURIComponent('token_exchange_failed')}`,
    };
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  const accessToken = tokenJson.access_token || '';
  if (!accessToken) {
    return {
      ok: false,
      error: 'Empty access_token from ARC Tracker OAuth',
      redirectUrl: '/?authError=empty_token',
    };
  }

  return {
    ok: true,
    redirectUrl: `/?arcKey=${encodeURIComponent(accessToken)}&authSource=oauth-pkce`,
  };
}

export interface EmbarkResolvedIdentity {
  ok: boolean;
  embarkId?: string;
  embarkUserId?: string;
  email?: string;
  psnOnlineId?: string;
  psnAccountId?: string;
  linkedPlatforms: Array<{
    provider: string;
    displayName: string;
    accountId: string;
  }>;
  error?: string;
}

/**
 * Resolves an Embark ID JWT (`accessToken` from `https://id.embark.games/api/auth/session`)
 * into the player's Embark ID (`Name#1234`) and linked PlayStation Network Online ID.
 */
export async function resolveEmbarkSessionToken(
  rawInput: string
): Promise<EmbarkResolvedIdentity> {
  let token = rawInput.trim();

  // Extract from JSON if user pasted the entire https://id.embark.games/api/auth/session response
  if (token.startsWith('{')) {
    try {
      const parsed = JSON.parse(token) as { accessToken?: string; access_token?: string };
      token = (parsed.accessToken || parsed.access_token || '').trim();
    } catch {
      // Keep raw string
    }
  }

  const jwtMatch = token.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (jwtMatch) {
    token = jwtMatch[0];
  }

  if (!token || token.length < 20) {
    return {
      ok: false,
      linkedPlatforms: [],
      error: 'Invalid Embark session token. Log in at id.embark.games via PlayStation and copy /api/auth/session.',
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)',
  };

  let embarkId: string | undefined;
  let embarkUserId: string | undefined;
  let email: string | undefined;
  const linkedPlatforms: Array<{
    provider: string;
    displayName: string;
    accountId: string;
  }> = [];

  try {
    const profileRes = await fetch('https://id.embark.games/api/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify({ checkPlaytester: false }),
    });
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as {
        embarkUserId?: string;
        displayName?: string;
        displayNameDiscriminator?: string;
        email?: string;
      };
      embarkUserId = profile.embarkUserId;
      email = profile.email;
      if (profile.displayName) {
        embarkId = profile.displayNameDiscriminator
          ? `${profile.displayName}#${profile.displayNameDiscriminator}`
          : profile.displayName;
      }
    }
  } catch {
    // Continue to links check / JWT fallback
  }

  try {
    const linksRes = await fetch(
      'https://id.embark.games/api/http-web-proxy/account/links',
      {
        method: 'GET',
        headers,
      }
    );
    if (linksRes.ok) {
      const links = (await linksRes.json()) as Array<{
        ThirdPartyProviderName?: string;
        ThirdPartyUserID?: string;
        LastSeenAccountName?: string;
      }>;
      if (Array.isArray(links)) {
        for (const item of links) {
          if (item.ThirdPartyProviderName) {
            linkedPlatforms.push({
              provider: item.ThirdPartyProviderName,
              displayName: item.LastSeenAccountName || item.ThirdPartyUserID || '',
              accountId: item.ThirdPartyUserID || '',
            });
          }
        }
      }
    }
  } catch {
    // Ignore link fetch error
  }

  // Fallback: decode JWT payload claims if upstream rejected or was unreachable
  if (!embarkId) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8')
        ) as Record<string, unknown>;
        const name =
          (payload.preferred_username as string) ||
          (payload.name as string) ||
          (payload.nickname as string) ||
          (payload.sub as string);
        if (name) {
          embarkId = name;
        }
        if (typeof payload.sub === 'string' && !embarkUserId) {
          embarkUserId = payload.sub;
        }
      }
    } catch {
      // Ignore malformed JWT
    }
  }

  const psnEntry = linkedPlatforms.find((p) => p.provider === 'playstation');
  if (!embarkId && !psnEntry) {
    return {
      ok: false,
      linkedPlatforms,
      error: 'Embark session token expired or rejected by id.embark.games.',
    };
  }

  return {
    ok: true,
    embarkId: embarkId || psnEntry?.displayName || 'PlayStation Raider',
    embarkUserId,
    email,
    psnOnlineId: psnEntry?.displayName,
    psnAccountId: psnEntry?.accountId,
    linkedPlatforms,
  };
}

function extractCookieMap(headers: Headers): Record<string, string> {
  const map: Record<string, string> = {};
  const rawCookies: string[] =
    typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie ===
    'function'
      ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [headers.get('set-cookie') || ''].filter(Boolean);

  for (const c of rawCookies) {
    const firstPair = c.split(';')[0];
    const eqIdx = firstPair.indexOf('=');
    if (eqIdx > 0) {
      const k = firstPair.slice(0, eqIdx).trim();
      const v = firstPair.slice(eqIdx + 1).trim();
      map[k] = v;
    }
  }
  return map;
}

/**
 * Exchanges a Sony PlayStation Network `npsso` token (from `https://ca.account.sony.com/api/v1/ssocookie`)
 * via BOTH Sony Mobile OAuth AND the Embark ID PlayStation Federated OAuth chain.
 */
export async function syncPlayStationNpssoAndEmbark(rawNpsso: string): Promise<{
  ok: boolean;
  psnOnlineId?: string;
  psnAccountId?: string;
  embarkId?: string;
  embarkAccessToken?: string;
  linkedPlatforms?: Array<{ provider: string; displayName: string; accountId: string }>;
  error?: string;
}> {
  let npsso = rawNpsso.trim();
  if (npsso.startsWith('{')) {
    try {
      const parsed = JSON.parse(npsso) as { npsso?: string };
      if (parsed.npsso) {
        npsso = parsed.npsso.trim();
      }
    } catch {
      // Keep raw string
    }
  }
  const match64 = npsso.match(/[A-Za-z0-9]{64}/);
  if (match64) {
    npsso = match64[0];
  }

  if (!npsso || npsso.length < 32) {
    return {
      ok: false,
      error:
        'Invalid PlayStation NPSSO token. Sign in at playstation.com on your phone, open ca.account.sony.com/api/v1/ssocookie, and paste the 64-character npsso token.',
    };
  }

  let psnOnlineId: string | undefined;
  let psnAccountId: string | undefined;
  let embarkId: string | undefined;
  let embarkAccessToken: string | undefined;
  let linkedPlatforms: Array<{
    provider: string;
    displayName: string;
    accountId: string;
  }> = [];

  // Track A: Sony PSN Mobile OAuth (psn-api flow)
  try {
    const sonyAuthorizeUrl =
      'https://ca.account.sony.com/api/authz/v3/oauth/authorize' +
      '?access_type=offline' +
      '&client_id=09515159-7237-4370-9b40-3806e67c0891' +
      '&redirect_uri=com.scee.psxandroid.scecompcall://redirect' +
      '&response_type=code' +
      '&scope=psn:mobile.v2.core%20psn:clientapp';

    const codeRes = await fetch(sonyAuthorizeUrl, {
      redirect: 'manual',
      headers: {
        Cookie: `npsso=${npsso}`,
        'User-Agent': 'Mozilla/5.0 (PlayStation App)',
      },
    });

    const loc = codeRes.headers.get('location') || '';
    const codeMatch = loc.match(/[?&]code=([^&]+)/);
    if (codeMatch) {
      const accessCode = decodeURIComponent(codeMatch[1]);
      const tokenRes = await fetch(
        'https://ca.account.sony.com/api/authz/v3/oauth/token',
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code: accessCode,
            redirect_uri: 'com.scee.psxandroid.scecompcall://redirect',
            grant_type: 'authorization_code',
            token_format: 'jwt',
          }).toString(),
        }
      );

      if (tokenRes.ok) {
        const tokenJson = (await tokenRes.json()) as {
          access_token?: string;
          id_token?: string;
        };
        if (tokenJson.id_token) {
          try {
            const claims = JSON.parse(
              Buffer.from(tokenJson.id_token.split('.')[1], 'base64url').toString('utf8')
            ) as Record<string, unknown>;
            psnOnlineId =
              (claims.online_id as string) || (claims.preferred_username as string);
            psnAccountId = (claims.sub as string) || (claims.account_id as string);
          } catch {
            // Ignore JWT decode error
          }
        }
        if (tokenJson.access_token && !psnOnlineId) {
          const profRes = await fetch(
            'https://m.np.playstation.com/api/userProfile/v1/internal/users/me/profiles',
            {
              headers: { Authorization: `Bearer ${tokenJson.access_token}` },
            }
          );
          if (profRes.ok) {
            const profJson = (await profRes.json()) as { onlineId?: string };
            psnOnlineId = profJson.onlineId;
          }
        }
      }
    }
  } catch {
    // Continue to Track B (Embark Federated PSN OAuth)
  }

  // Track B: Embark ID PlayStation Federated OAuth Chain
  try {
    const step1 = await fetch(
      'https://id.embark.games/api/auth/login?provider=playstation',
      {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)' },
      }
    );
    const embarkCookies = extractCookieMap(step1.headers);
    const embarkAuthUrl = step1.headers.get('location');

    if (embarkAuthUrl) {
      const step2 = await fetch(embarkAuthUrl, {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)' },
      });
      const sonyFedUrl = step2.headers.get('location');

      if (sonyFedUrl && sonyFedUrl.includes('ca.account.sony.com')) {
        const step3 = await fetch(sonyFedUrl, {
          redirect: 'manual',
          headers: {
            Cookie: `npsso=${npsso}`,
            'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)',
          },
        });
        const embarkCallbackUrl = step3.headers.get('location');

        if (embarkCallbackUrl && embarkCallbackUrl.includes('auth.embark.net')) {
          const step4 = await fetch(embarkCallbackUrl, {
            redirect: 'manual',
            headers: { 'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)' },
          });
          const idCallbackUrl = step4.headers.get('location');

          if (idCallbackUrl && idCallbackUrl.includes('id.embark.games')) {
            const cookieHeader = Object.entries(embarkCookies)
              .map(([k, v]) => `${k}=${v}`)
              .join('; ');
            const step5 = await fetch(idCallbackUrl, {
              redirect: 'manual',
              headers: {
                Cookie: cookieHeader,
                'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)',
              },
            });
            const sessionCookies = {
              ...embarkCookies,
              ...extractCookieMap(step5.headers),
            };
            const fullCookieHeader = Object.entries(sessionCookies)
              .map(([k, v]) => `${k}=${v}`)
              .join('; ');

            const step6 = await fetch('https://id.embark.games/api/auth/session', {
              headers: {
                Cookie: fullCookieHeader,
                'User-Agent': 'Mozilla/5.0 (arc-mobile console-bridge)',
              },
            });
            if (step6.ok) {
              const sessJson = (await step6.json()) as { accessToken?: string };
              if (sessJson.accessToken) {
                embarkAccessToken = sessJson.accessToken;
                const resolved = await resolveEmbarkSessionToken(sessJson.accessToken);
                if (resolved.ok) {
                  embarkId = resolved.embarkId;
                  psnOnlineId = psnOnlineId || resolved.psnOnlineId;
                  psnAccountId = psnAccountId || resolved.psnAccountId;
                  linkedPlatforms = resolved.linkedPlatforms;
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // Ignore federated chain error if Sony OAuth succeeded
  }

  if (!psnOnlineId && !embarkId) {
    return {
      ok: false,
      error:
        'Sony PSN NPSSO token was rejected or expired. Please sign in at playstation.com on your phone and copy a fresh npsso token from ca.account.sony.com/api/v1/ssocookie.',
    };
  }

  return {
    ok: true,
    psnOnlineId: psnOnlineId || embarkId,
    psnAccountId,
    embarkId: embarkId || (psnOnlineId ? `${psnOnlineId} (PSN)` : undefined),
    embarkAccessToken,
    linkedPlatforms,
  };
}

/**
 * Uses Azure AI Foundry `gpt-6-astra` Multimodal Vision / Natural Language to parse
 * a PlayStation 5 player's TV photo, PS App screenshot, or voice/text raid report
 * into structured `PlayerProgressState` updates.
 */
export async function runConsoleAiStateSync(
  body: Record<string, unknown>,
  foundryEndpoint: string,
  primaryModel: string,
  auth: FoundryAuthCredentials
): Promise<{ status: number; data: unknown }> {
  if (!auth.headerName || !auth.headerValue) {
    return {
      status: 503,
      data: {
        ok: false,
        error: 'Azure AI Foundry authentication unavailable.',
      },
    };
  }

  const imageDataUrl =
    typeof body.imageDataUrl === 'string' ? body.imageDataUrl.trim() : '';
  const transcript =
    typeof body.transcript === 'string' ? body.transcript.trim() : '';
  const catalogDigest =
    typeof body.catalogDigest === 'string' ? body.catalogDigest : '';

  if (!imageDataUrl && !transcript) {
    return {
      status: 400,
      data: {
        ok: false,
        error: 'Provide either a TV/PS App screenshot (imageDataUrl) or a voice/text raid summary (transcript).',
      },
    };
  }

  const systemPrompt = [
    'You are the ARC Raiders PlayStation 5 & Console Progression Extractor (`gpt-6-astra`).',
    'Console players cannot run PC screen-scraping overlays. Instead, they snap a photo of their TV screen, upload a PlayStation App screenshot, or speak/type what they have in their Stash, Loadout, Workshop (Hideout), or Quests.',
    'Map every item, weapon, shield, augment, workshop station level, and quest strictly to the canonical IDs provided in the catalog digest below.',
    catalogDigest,
    'Return ONLY valid JSON (no markdown fences) matching this exact schema:',
    JSON.stringify({
      summary: 'Concise 1-sentence confirmation of what was synced from PS5.',
      detectedUsername: 'Optional string or null',
      detectedLevel: 'Optional number or null',
      detectedCoins: 'Optional number or null',
      stashUpdates: [
        {
          itemId: 'canonical_item_id',
          quantity: 2,
          mode: 'set_or_add',
        },
      ],
      loadoutUpdates: {
        primaryWeaponId: 'optional_weapon_id_or_null',
        secondaryWeaponId: 'optional_weapon_id_or_null',
        shieldId: 'optional_shield_id_or_null',
        augmentId: 'optional_augment_id_or_null',
      },
      hideoutLevelUpdates: {
        gunsmith: 2,
      },
      completedQuestIdsToAdd: ['optional_quest_id'],
      activeQuestIdsToAdd: ['optional_quest_id'],
    }),
  ].join('\n\n');

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'input_text',
      text: transcript
        ? `PlayStation 5 player report / note: "${transcript}". Extract all matching ARC Raiders stash items, equipped loadout gear, workshop station levels, and quests into strict JSON.`
        : 'Inspect this PlayStation 5 TV photo / PS App screenshot of ARC Raiders and extract all visible stash items + quantities, equipped loadout items, workshop station levels, and quests into strict JSON.',
    },
  ];

  if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
    userContent.push({
      type: 'input_image',
      image_url: imageDataUrl,
    });
  }

  const payload = {
    model: primaryModel,
    store: false,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: systemPrompt }],
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
  };

  try {
    const res = await fetch(foundryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [auth.headerName]: auth.headerValue,
      },
      body: JSON.stringify(payload),
    });

    const rawJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        status: res.status,
        data: {
          ok: false,
          error: 'Foundry multimodal sync call failed.',
          details: rawJson,
        },
      };
    }

    // Extract assistant message text from Responses API output
    let outputText =
      typeof rawJson.output_text === 'string' ? rawJson.output_text : '';
    if (!outputText && Array.isArray(rawJson.output)) {
      for (const item of rawJson.output as Array<Record<string, unknown>>) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const part of item.content as Array<Record<string, unknown>>) {
            if (typeof part.text === 'string') {
              outputText += part.text;
            }
          }
        }
      }
    }

    const cleaned = outputText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const jsonSlice =
      firstBrace !== -1 && lastBrace > firstBrace
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;

    const extracted = JSON.parse(jsonSlice) as Record<string, unknown>;
    return {
      status: 200,
      data: {
        ok: true,
        modelUsed: rawJson.model || primaryModel,
        responseId: rawJson.id,
        patch: extracted,
      },
    };
  } catch (err) {
    return {
      status: 502,
      data: {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to parse Console AI Sync response',
      },
    };
  }
}
