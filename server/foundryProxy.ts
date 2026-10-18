import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  startArcTrackerOAuthFlow,
  completeArcTrackerOAuthCallback,
  resolveEmbarkSessionToken,
  syncPlayStationNpssoAndEmbark,
  runConsoleAiStateSync,
} from './consoleAuthBridge.ts';

export const FOUNDRY_ENDPOINT =
  process.env.FOUNDRY_ENDPOINT ||
  'https://gaia-foundry-202045.openai.azure.com/openai/v1/responses';
export const PRIMARY_MODEL = process.env.FOUNDRY_MODEL || 'gpt-6-astra';
export const FALLBACK_MODEL = 'model-router';
export const RESOURCE_GROUP = 'rg-gaia';
export const FOUNDRY_ACCOUNT = 'gaia-foundry-202045';
export const DEFAULT_PORT = Number(
  process.env.FOUNDRY_PROXY_PORT || process.env.PORT || 8787
);

const AZ_PYTHON_PATH = 'C:\\Users\\Admin\\azcli-venv\\Scripts\\python.exe';
const GAIA_ENV_PATH = 'C:\\repos\\gaia-robot\\infra\\.env';
const TOKEN_TTL_MS = 45 * 60 * 1000;

let cachedAadToken: string | null = null;
let cachedTokenExpiresAt = 0;

export interface FoundryAuthCredentials {
  mode: 'api-key' | 'aad-bearer' | 'none';
  headerName?: 'api-key' | 'Authorization';
  headerValue?: string;
}

function readGaiaEnvApiKey(): string | null {
  try {
    if (!fs.existsSync(GAIA_ENV_PATH)) {
      return null;
    }
    const content = fs.readFileSync(GAIA_ENV_PATH, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const match = rawLine.match(/^\s*FOUNDRY_API_KEY\s*=\s*(.+)\s*$/);
      if (match) {
        const cleaned = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch {
    // Ignore unreadable .env
  }
  return null;
}

/**
 * Resolves authentication for gaia-foundry-202045 (rg-gaia):
 * 1. FOUNDRY_API_KEY env var (or C:\repos\gaia-robot\infra\.env if configured)
 * 2. FOUNDRY_AAD_TOKEN env var
 * 3. Keyless Azure CLI token minting via C:\Users\Admin\azcli-venv\Scripts\python.exe -m azure.cli
 */
export function resolveFoundryAuth(): FoundryAuthCredentials {
  const apiKey = process.env.FOUNDRY_API_KEY?.trim() || readGaiaEnvApiKey();
  if (apiKey) {
    return {
      mode: 'api-key',
      headerName: 'api-key',
      headerValue: apiKey,
    };
  }

  const envAadToken = process.env.FOUNDRY_AAD_TOKEN?.trim();
  if (envAadToken) {
    return {
      mode: 'aad-bearer',
      headerName: 'Authorization',
      headerValue: `Bearer ${envAadToken}`,
    };
  }

  const now = Date.now();
  if (cachedAadToken && now < cachedTokenExpiresAt) {
    return {
      mode: 'aad-bearer',
      headerName: 'Authorization',
      headerValue: `Bearer ${cachedAadToken}`,
    };
  }

  try {
    const stdout = execFileSync(
      AZ_PYTHON_PATH,
      [
        '-m',
        'azure.cli',
        'account',
        'get-access-token',
        '--resource',
        'https://ai.azure.com',
        '--query',
        'accessToken',
        '-o',
        'tsv',
      ],
      {
        encoding: 'utf8',
        timeout: 20_000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    ).trim();

    if (stdout && stdout.length > 20) {
      cachedAadToken = stdout;
      cachedTokenExpiresAt = now + TOKEN_TTL_MS;
      return {
        mode: 'aad-bearer',
        headerName: 'Authorization',
        headerValue: `Bearer ${cachedAadToken}`,
      };
    }
  } catch {
    // Offline or Azure CLI session unavailable
  }

  return { mode: 'none' };
}

/**
 * Resolves Azure AI Foundry credentials including Azure Container Apps Managed Identity
 * (`IDENTITY_ENDPOINT` + `IDENTITY_HEADER` or IMDS) when running in production (`rg-gaia`).
 */
export async function resolveFoundryAuthAsync(): Promise<FoundryAuthCredentials> {
  const syncAuth = resolveFoundryAuth();
  if (syncAuth.mode !== 'none') {
    return syncAuth;
  }

  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;
  const now = Date.now();

  if (identityEndpoint && identityHeader) {
    for (const resource of [
      'https://ai.azure.com',
      'https://cognitiveservices.azure.com',
    ]) {
      try {
        const url = `${identityEndpoint}?api-version=2019-08-01&resource=${encodeURIComponent(
          resource
        )}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-IDENTITY-HEADER': identityHeader,
            Metadata: 'true',
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { access_token?: string };
          if (data.access_token && data.access_token.length > 20) {
            cachedAadToken = data.access_token;
            cachedTokenExpiresAt = now + TOKEN_TTL_MS;
            return {
              mode: 'aad-bearer',
              headerName: 'Authorization',
              headerValue: `Bearer ${data.access_token}`,
            };
          }
        }
      } catch {
        // Try next resource or fallback
      }
    }
  }

  return { mode: 'none' };
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function tryServeStaticAsset(urlPath: string, res: http.ServerResponse): boolean {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    return false;
  }

  const cleanRel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const candidate = path.resolve(distDir, cleanRel);
  if (!candidate.startsWith(distDir)) {
    return false;
  }

  let fileToServe = candidate;
  if (!fs.existsSync(fileToServe) || fs.statSync(fileToServe).isDirectory()) {
    const fallbackIndex = path.join(distDir, 'index.html');
    if (!path.extname(cleanRel) && fs.existsSync(fallbackIndex)) {
      fileToServe = fallbackIndex;
    } else {
      return false;
    }
  }

  const ext = path.extname(fileToServe).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const content = fs.readFileSync(fileToServe);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  res.end(content);
  return true;
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Key',
  });
  res.end(body);
}

async function callFoundryResponsesApi(
  requestBody: Record<string, unknown>,
  auth: FoundryAuthCredentials
): Promise<{ status: number; data: unknown; modelUsed: string }> {
  if (!auth.headerName || !auth.headerValue) {
    return {
      status: 503,
      data: {
        error: 'No Azure AI Foundry auth token available. Run scripts/connect-azure.ps1.',
      },
      modelUsed: 'none',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [auth.headerName]: auth.headerValue,
  };

  const primaryPayload: Record<string, unknown> = {
    ...requestBody,
    model: (requestBody.model as string) || PRIMARY_MODEL,
    store: false,
  };

  try {
    const primaryRes = await fetch(FOUNDRY_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(primaryPayload),
    });

    if (primaryRes.ok) {
      const json = await primaryRes.json();
      return {
        status: primaryRes.status,
        data: json,
        modelUsed: String(primaryPayload.model),
      };
    }

    // If primary model rejected custom function tool schema, retry primary model with web_search only
    if (
      Array.isArray(primaryPayload.tools) &&
      primaryPayload.tools.length > 1
    ) {
      const webSearchOnlyPayload: Record<string, unknown> = {
        ...primaryPayload,
        tools: [{ type: 'web_search' }],
      };
      const retryPrimaryRes = await fetch(FOUNDRY_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(webSearchOnlyPayload),
      });
      if (retryPrimaryRes.ok) {
        const retryJson = await retryPrimaryRes.json();
        return {
          status: retryPrimaryRes.status,
          data: retryJson,
          modelUsed: String(primaryPayload.model),
        };
      }
    }

    // Fallback to model-router if primary deployment fails
    const fallbackPayload: Record<string, unknown> = {
      ...primaryPayload,
      model: FALLBACK_MODEL,
    };
    delete fallbackPayload.tools;
    delete fallbackPayload.include;

    const fallbackRes = await fetch(FOUNDRY_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(fallbackPayload),
    });

    const fallbackJson = await fallbackRes.json().catch(() => ({}));
    return {
      status: fallbackRes.status,
      data: fallbackJson,
      modelUsed: FALLBACK_MODEL,
    };
  } catch (err) {
    return {
      status: 502,
      data: {
        error: err instanceof Error ? err.message : 'Foundry upstream request failed',
      },
      modelUsed: 'none',
    };
  }
}

async function handleArcTrackerSync(
  req: http.IncomingMessage,
  body: Record<string, unknown>
): Promise<{ status: number; data: unknown }> {
  const headerAppKey = req.headers['x-app-key'];
  const headerAuth = req.headers['authorization'];

  const appApiKey =
    (typeof body.appApiKey === 'string' && body.appApiKey.trim()) ||
    (typeof headerAppKey === 'string' && headerAppKey.trim()) ||
    '';

  const rawUserKey =
    (typeof body.userApiKey === 'string' && body.userApiKey.trim()) ||
    (typeof headerAuth === 'string' && headerAuth.replace(/^Bearer\s+/i, '').trim()) ||
    '';

  if (!appApiKey || !rawUserKey) {
    return {
      status: 400,
      data: {
        ok: false,
        error: 'Both appApiKey (arc_k1_...) and userApiKey (arc_u1_...) are required.',
      },
    };
  }

  const singleEndpoint =
    typeof body.endpoint === 'string' ? body.endpoint.replace(/^\/+/, '') : null;
  const endpoints = singleEndpoint
    ? [singleEndpoint]
    : ['profile', 'stash', 'loadout', 'hideout', 'quests', 'projects', 'blueprints'];

  const results: Record<string, unknown> = {};
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-App-Key': appApiKey,
    Authorization: `Bearer ${rawUserKey}`,
  };

  let anySuccess = false;
  const combined: Record<string, unknown> = {};

  await Promise.all(
    endpoints.map(async (ep) => {
      const cleanEp = ep.replace(/^api\/v2\/user\//, '');
      const url = `https://arctracker.io/api/v2/user/${cleanEp}`;
      try {
        const response = await fetch(url, { method: 'GET', headers });
        const json = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        results[cleanEp] = {
          ok: response.ok,
          status: response.status,
          data: json,
        };
        if (response.ok && json && typeof json === 'object') {
          anySuccess = true;
          if (cleanEp === 'profile') {
            Object.assign(combined, (json.data as object) ?? json);
          } else if (cleanEp === 'stash') {
            combined.stash = Array.isArray(json)
              ? json
              : json.stash ?? json.items ?? json.data;
          } else if (cleanEp === 'loadout') {
            combined.loadout = json.loadout ?? json.data ?? json;
          } else if (cleanEp === 'hideout') {
            combined.hideoutLevels = json.hideoutLevels ?? json.data ?? json;
          } else if (cleanEp === 'quests') {
            if (Array.isArray(json.completedQuestIds)) {
              combined.completedQuestIds = json.completedQuestIds;
            }
            if (Array.isArray(json.activeQuestIds)) {
              combined.activeQuestIds = json.activeQuestIds;
            }
          } else if (cleanEp === 'projects') {
            combined.completedProjectStages =
              json.completedProjectStages ?? json.data ?? json;
          } else if (cleanEp === 'blueprints') {
            if (Array.isArray(json.learnedBlueprintIds)) {
              combined.learnedBlueprintIds = json.learnedBlueprintIds;
            }
          }
        }
      } catch (err) {
        results[cleanEp] = {
          ok: false,
          status: 502,
          error: err instanceof Error ? err.message : 'Upstream fetch failed',
        };
      }
    })
  );

  if (!anySuccess) {
    return {
      status: 502,
      data: {
        ok: false,
        error: 'ARC Tracker v2 upstream unavailable or rejected credentials.',
        endpoints: results,
      },
    };
  }

  const syncedAt = new Date().toISOString();
  return {
    status: 200,
    data: {
      ok: true,
      syncedAt,
      ...combined,
      playerState: {
        ...combined,
        syncedAt,
      },
      endpoints: results,
    },
  };
}

export function createFoundryProxyServer(): http.Server {
  return http.createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = (req.url || '/').split('?')[0];

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Key',
      });
      res.end();
      return;
    }

    if (method === 'GET' && (url === '/api/foundry/status' || url === '/healthz')) {
      const auth = await resolveFoundryAuthAsync();
      sendJson(res, 200, {
        ok: true,
        foundryEndpoint: FOUNDRY_ENDPOINT,
        foundryAccount: FOUNDRY_ACCOUNT,
        model: PRIMARY_MODEL,
        fallbackModel: FALLBACK_MODEL,
        resourceGroup: RESOURCE_GROUP,
        hasAuthToken: auth.mode !== 'none',
        authMode: auth.mode,
      });
      return;
    }

    if (method === 'POST' && url === '/api/foundry/autonomous-plan') {
      try {
        const body = await readJsonBody(req);
        const payload =
          body && typeof body.payload === 'object' && body.payload !== null
            ? (body.payload as Record<string, unknown>)
            : body;
        const auth = await resolveFoundryAuthAsync();
        const result = await callFoundryResponsesApi(payload, auth);
        sendJson(res, result.status, result.data);
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Invalid request payload',
        });
      }
      return;
    }

    if (method === 'POST' && url === '/api/arctracker/sync') {
      try {
        const body = await readJsonBody(req);
        const result = await handleArcTrackerSync(req, body);
        sendJson(res, result.status, result.data);
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          error: err instanceof Error ? err.message : 'Invalid sync request body',
        });
      }
      return;
    }

    if (method === 'GET' && url === '/api/auth/arctracker/oauth/start') {
      try {
        const proto =
          (req.headers['x-forwarded-proto'] as string) ||
          (req.headers.host?.includes('azurecontainerapps.io') ? 'https' : 'http');
        const host = req.headers.host || `127.0.0.1:${DEFAULT_PORT}`;
        const originUrl = `${proto}://${host}`;
        const authorizeRedirectUrl = await startArcTrackerOAuthFlow(originUrl);
        res.writeHead(302, { Location: authorizeRedirectUrl });
        res.end();
      } catch (err) {
        sendJson(res, 502, {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to start ARC Tracker OAuth2 flow',
        });
      }
      return;
    }

    if (method === 'GET' && url === '/api/auth/arctracker/callback') {
      try {
        const rawQuery = (req.url || '').split('?')[1] || '';
        const params = new URLSearchParams(rawQuery);
        const result = await completeArcTrackerOAuthCallback(params);
        res.writeHead(302, { Location: result.redirectUrl });
        res.end();
      } catch (err) {
        res.writeHead(302, {
          Location: `/?authError=${encodeURIComponent(
            err instanceof Error ? err.message : 'oauth_callback_error'
          )}`,
        });
        res.end();
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/embark/resolve') {
      try {
        const body = await readJsonBody(req);
        const rawToken =
          typeof body.accessToken === 'string'
            ? body.accessToken
            : typeof body.rawInput === 'string'
              ? body.rawInput
              : '';
        const resolved = await resolveEmbarkSessionToken(rawToken);
        sendJson(res, resolved.ok ? 200 : 400, resolved);
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to resolve Embark session',
        });
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/playstation/sync') {
      try {
        const body = await readJsonBody(req);
        const rawNpsso =
          typeof body.npsso === 'string'
            ? body.npsso
            : typeof body.rawInput === 'string'
              ? body.rawInput
              : '';
        const psnResult = await syncPlayStationNpssoAndEmbark(rawNpsso);
        sendJson(res, psnResult.ok ? 200 : 400, psnResult);
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          error: err instanceof Error ? err.message : 'PlayStation NPSSO sync failed',
        });
      }
      return;
    }

    if (method === 'POST' && url === '/api/foundry/console-sync') {
      try {
        const body = await readJsonBody(req);
        const auth = await resolveFoundryAuthAsync();
        const result = await runConsoleAiStateSync(
          body,
          FOUNDRY_ENDPOINT,
          PRIMARY_MODEL,
          auth
        );
        sendJson(res, result.status, result.data);
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          error: err instanceof Error ? err.message : 'Console AI state sync failed',
        });
      }
      return;
    }

    if ((method === 'GET' || method === 'HEAD') && !url.startsWith('/api/')) {
      if (tryServeStaticAsset(url, res)) {
        return;
      }
    }

    sendJson(res, 404, { ok: false, error: `Route not found: ${method} ${url}` });
  });
}

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (isMainModule) {
  const bindHost = process.env.HOST || '0.0.0.0';
  const server = createFoundryProxyServer();
  server.listen(DEFAULT_PORT, bindHost, () => {
    console.log(
      `[arc-mobile foundryProxy] Listening on http://${bindHost}:${DEFAULT_PORT} -> ${FOUNDRY_ENDPOINT} (${PRIMARY_MODEL} in ${RESOURCE_GROUP})`
    );
  });
}
