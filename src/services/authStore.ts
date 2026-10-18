import type { AuthCredentials } from '../shared/types';

export const AUTH_STORAGE_KEY = 'arc_mobile_auth_v1';
export const AUTH_COOKIE_NAME = 'arc_raiders_auth_backup';
export const LEGACY_AUTH_COOKIE_NAME = 'arc_mobile_auth_backup';
export const AUTH_COOKIE_MAX_AGE_SECONDS = 31536000; // 1 year (365 days)
export const DEFAULT_APP_KEY = 'arc_k1_hobby_companion_dev';
export const DEMO_USER_API_KEY = 'arc_u1_demo_raider_key';

const USER_KEY_REGEX = /arc_u1_[A-Za-z0-9_-]+/;
const APP_KEY_REGEX = /arc_k1_[A-Za-z0-9_-]+/;
const JWT_REGEX = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
const NPSSO_JSON_REGEX = /"npsso"\s*:\s*"([A-Za-z0-9]{64})"/;

function isValidAuthSource(
  source: unknown,
): source is AuthCredentials['source'] {
  return (
    source === 'manual' ||
    source === 'browser-pull' ||
    source === 'clipboard' ||
    source === 'url-param' ||
    source === 'oauth-pkce' ||
    source === 'psn-npsso' ||
    source === 'embark-session' ||
    source === 'console-vision' ||
    source === 'demo'
  );
}

function normalizeCredentials(
  input: Partial<AuthCredentials> & { userApiKey: string },
): AuthCredentials {
  const userApiKey = input.userApiKey.trim();
  const appApiKey = (input.appApiKey ?? DEFAULT_APP_KEY).trim() || DEFAULT_APP_KEY;
  const savedAt =
    typeof input.savedAt === 'string' && input.savedAt.trim().length > 0
      ? input.savedAt
      : new Date().toISOString();
  const source: AuthCredentials['source'] = isValidAuthSource(input.source)
    ? input.source
    : userApiKey === DEMO_USER_API_KEY
      ? 'demo'
      : 'manual';

  return {
    userApiKey,
    appApiKey,
    savedAt,
    source,
    ...(input.embarkAccessToken ? { embarkAccessToken: input.embarkAccessToken } : {}),
    ...(input.psnNpsso ? { psnNpsso: input.psnNpsso } : {}),
    ...(input.embarkId ? { embarkId: input.embarkId } : {}),
    ...(input.psnOnlineId ? { psnOnlineId: input.psnOnlineId } : {}),
  };
}

function parseStoredCredentials(raw: string | null | undefined): AuthCredentials | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthCredentials>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.userApiKey !== 'string' ||
      parsed.userApiKey.trim().length === 0
    ) {
      return null;
    }
    return normalizeCredentials({
      userApiKey: parsed.userApiKey,
      appApiKey: parsed.appApiKey,
      savedAt: parsed.savedAt,
      source: parsed.source,
      embarkAccessToken: parsed.embarkAccessToken,
      psnNpsso: parsed.psnNpsso,
      embarkId: parsed.embarkId,
      psnOnlineId: parsed.psnOnlineId,
    });
  } catch {
    return null;
  }
}

function writeLocalStorage(serialized: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage quota or security errors in restricted contexts
  }
}

function readLocalStorage(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function writeBackupCookie(serialized: string): void {
  try {
    if (typeof document !== 'undefined') {
      const encoded = encodeURIComponent(serialized);
      document.cookie = `${AUTH_COOKIE_NAME}=${encoded}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
      document.cookie = `${LEGACY_AUTH_COOKIE_NAME}=${encoded}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    }
  } catch {
    // Ignore cookie errors in non-browser contexts
  }
}

function readBackupCookie(): string | null {
  try {
    if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
      return null;
    }
    const cookies = document.cookie.split(';');
    for (const cookieName of [AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME]) {
      for (const entry of cookies) {
        const trimmed = entry.trim();
        if (trimmed.startsWith(`${cookieName}=`)) {
          const rawValue = trimmed.slice(cookieName.length + 1);
          if (!rawValue) {
            continue;
          }
          return decodeURIComponent(rawValue);
        }
      }
    }
  } catch {
    // Ignore malformed cookie encoding
  }
  return null;
}

/**
 * Saves player authentication credentials into both `localStorage` (`arc_mobile_auth_v1`)
 * and a 1-year backup browser cookie (`arc_mobile_auth_backup`, `max-age=31536000`).
 */
export function saveAuthCredentials(creds: AuthCredentials): AuthCredentials {
  const normalized = normalizeCredentials(creds);
  const serialized = JSON.stringify(normalized);
  writeLocalStorage(serialized);
  writeBackupCookie(serialized);
  return normalized;
}

/**
 * Loads player authentication credentials from `localStorage` (`arc_mobile_auth_v1`)
 * or automatically recovers from the 1-year backup cookie (`arc_mobile_auth_backup`)
 * if `localStorage` was cleared. Also heals whichever store is missing.
 */
export function loadAuthCredentials(): AuthCredentials | null {
  const fromLocal = parseStoredCredentials(readLocalStorage());
  if (fromLocal) {
    const cookieRaw = readBackupCookie();
    if (!parseStoredCredentials(cookieRaw)) {
      writeBackupCookie(JSON.stringify(fromLocal));
    }
    return fromLocal;
  }

  const fromCookie = parseStoredCredentials(readBackupCookie());
  if (fromCookie) {
    writeLocalStorage(JSON.stringify(fromCookie));
    return fromCookie;
  }

  return null;
}

/**
 * Clears player authentication credentials from both `localStorage` and the backup cookie.
 */
export function clearAuthCredentials(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage removal errors
  }

  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${LEGACY_AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch {
    // Ignore cookie removal errors
  }
}

/**
 * Exports a portable JSON backup string of the given (or currently stored) `AuthCredentials`.
 */
export function exportAuthCredentialsBackup(
  creds?: AuthCredentials | null,
): string {
  const target = creds ?? loadAuthCredentials();
  if (!target) {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        credentials: null,
      },
      null,
      2,
    );
  }
  const normalized = normalizeCredentials(target);
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      ...normalized,
      credentials: normalized,
    },
    null,
    2,
  );
}

/**
 * Imports and persists `AuthCredentials` from a JSON backup blob or raw key text.
 */
export function importAuthCredentialsBackup(
  rawBackup: string,
): AuthCredentials | null {
  if (!rawBackup || typeof rawBackup !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(rawBackup) as Record<string, unknown>;
    const candidate =
      parsed &&
      typeof parsed.credentials === 'object' &&
      parsed.credentials !== null
        ? (parsed.credentials as Record<string, unknown>)
        : parsed;

    if (
      candidate &&
      typeof candidate.userApiKey === 'string' &&
      candidate.userApiKey.trim().startsWith('arc_u1_')
    ) {
      return saveAuthCredentials({
        userApiKey: candidate.userApiKey.trim(),
        appApiKey:
          typeof candidate.appApiKey === 'string' &&
          candidate.appApiKey.trim().length > 0
            ? candidate.appApiKey.trim()
            : DEFAULT_APP_KEY,
        savedAt:
          typeof candidate.savedAt === 'string' &&
          candidate.savedAt.trim().length > 0
            ? candidate.savedAt.trim()
            : new Date().toISOString(),
        source: isValidAuthSource(candidate.source)
          ? candidate.source
          : 'manual',
      });
    }
  } catch {
    // Fall through to regex extraction if not strict JSON
  }

  const extracted = extractKeysFromText(rawBackup);
  if (!extracted.userApiKey) {
    return null;
  }

  return saveAuthCredentials({
    userApiKey: extracted.userApiKey,
    appApiKey: extracted.appApiKey ?? DEFAULT_APP_KEY,
    savedAt: new Date().toISOString(),
    source: 'manual',
  });
}

/**
 * Extracts a single personal `arc_u1_...` key from arbitrary text, URLs, or clipboard content.
 */
export function extractArcKeyFromText(raw: string): string | null {
  return extractKeysFromText(raw).userApiKey ?? null;
}

/**
 * Parses `arc_u1_[A-Za-z0-9_-]+`, `arc_k1_[A-Za-z0-9_-]+`, Embark session JWTs (`eyJ...`),
 * and Sony PSN `npsso` tokens from raw pasted text, URL query strings, URL hashes, or JSON blobs.
 */
export function extractKeysFromText(raw: string): {
  userApiKey?: string;
  appApiKey?: string;
  embarkAccessToken?: string;
  psnNpsso?: string;
  authSource?: AuthCredentials['source'];
} {
  if (!raw || typeof raw !== 'string') {
    return {};
  }

  let candidateText = raw;
  try {
    if (raw.includes('%')) {
      candidateText = `${raw} ${decodeURIComponent(raw)}`;
    }
  } catch {
    // Keep original raw string if URI decoding fails
  }

  const userMatch = candidateText.match(USER_KEY_REGEX);
  const appMatch = candidateText.match(APP_KEY_REGEX);
  const jwtMatch = candidateText.match(JWT_REGEX);
  const npssoMatch = candidateText.match(NPSSO_JSON_REGEX);
  const urlArcKeyMatch = candidateText.match(/[?&]arcKey=([^&#\s]+)/);
  const urlAuthSourceMatch = candidateText.match(/[?&]authSource=([^&#\s]+)/);

  const extracted: {
    userApiKey?: string;
    appApiKey?: string;
    embarkAccessToken?: string;
    psnNpsso?: string;
    authSource?: AuthCredentials['source'];
  } = {};

  if (userMatch?.[0]) {
    extracted.userApiKey = userMatch[0];
  } else if (urlArcKeyMatch?.[1]) {
    extracted.userApiKey = decodeURIComponent(urlArcKeyMatch[1]);
  }
  if (appMatch?.[0]) {
    extracted.appApiKey = appMatch[0];
  }
  if (jwtMatch?.[0]) {
    extracted.embarkAccessToken = jwtMatch[0];
  }
  if (npssoMatch?.[1]) {
    extracted.psnNpsso = npssoMatch[1];
  }
  if (urlAuthSourceMatch?.[1] && isValidAuthSource(urlAuthSourceMatch[1])) {
    extracted.authSource = urlAuthSourceMatch[1];
  }

  return extracted;
}

/**
 * Checks `window.location.search` and `window.location.hash` first, then tries
 * `navigator.clipboard.readText()` if available. When a valid `arc_u1_...` key,
 * OAuth token, Embark session JWT, or PSN NPSSO token is found, saves and returns `AuthCredentials`.
 */
export async function pullAuthFromBrowserEnvironment(): Promise<AuthCredentials | null> {
  const existing = loadAuthCredentials();

  if (typeof window !== 'undefined' && window.location) {
    const locationText = `${window.location.search ?? ''} ${window.location.hash ?? ''}`.trim();
    if (locationText.length > 0) {
      const fromUrl = extractKeysFromText(locationText);
      if (fromUrl.userApiKey) {
        return saveAuthCredentials({
          userApiKey: fromUrl.userApiKey,
          appApiKey: fromUrl.appApiKey ?? existing?.appApiKey ?? DEFAULT_APP_KEY,
          savedAt: new Date().toISOString(),
          source: fromUrl.authSource ?? 'url-param',
        });
      }
    }
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.readText === 'function'
  ) {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const fromClipboard = extractKeysFromText(clipboardText);
      if (fromClipboard.userApiKey) {
        return saveAuthCredentials({
          userApiKey: fromClipboard.userApiKey,
          appApiKey: fromClipboard.appApiKey ?? existing?.appApiKey ?? DEFAULT_APP_KEY,
          savedAt: new Date().toISOString(),
          source: 'clipboard',
        });
      }
      if (fromClipboard.embarkAccessToken) {
        return saveAuthCredentials({
          userApiKey: `arc_u1_embark_${fromClipboard.embarkAccessToken.slice(-16)}`,
          appApiKey: existing?.appApiKey ?? DEFAULT_APP_KEY,
          savedAt: new Date().toISOString(),
          source: 'embark-session',
          embarkAccessToken: fromClipboard.embarkAccessToken,
        });
      }
      if (fromClipboard.psnNpsso) {
        return saveAuthCredentials({
          userApiKey: `arc_u1_psn_${fromClipboard.psnNpsso.slice(0, 16)}`,
          appApiKey: existing?.appApiKey ?? DEFAULT_APP_KEY,
          savedAt: new Date().toISOString(),
          source: 'psn-npsso',
          psnNpsso: fromClipboard.psnNpsso,
        });
      }
    } catch {
      // Clipboard read permission denied or unavailable
    }
  }

  if (typeof window !== 'undefined' && typeof window.name === 'string' && window.name.length > 0) {
    const fromWindow = extractKeysFromText(window.name);
    if (fromWindow.userApiKey) {
      return saveAuthCredentials({
        userApiKey: fromWindow.userApiKey,
        appApiKey: fromWindow.appApiKey ?? existing?.appApiKey ?? DEFAULT_APP_KEY,
        savedAt: new Date().toISOString(),
        source: 'browser-pull',
      });
    }
  }

  return null;
}

/**
 * Opens the ARC Tracker settings (or AI connector) page in a new tab so the player can copy their personal API key.
 */
export function openArcTrackerKeyPage(
  page: 'settings' | 'ai-connector' = 'settings',
): void {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const url =
      page === 'ai-connector'
        ? 'https://arctracker.io/ai-connector'
        : 'https://arctracker.io/settings';
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Opens Embark ID PlayStation Network Federated Sign-In (`id.embark.games`) or the Embark Session JSON page.
 */
export function openEmbarkPlayStationAuthPage(
  step: 'login-psn' | 'session-json' = 'login-psn',
): void {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const url =
      step === 'session-json'
        ? 'https://id.embark.games/api/auth/session'
        : 'https://id.embark.games/api/auth/login?provider=playstation';
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Opens Sony PlayStation Network Login or the Sony SSO Cookie endpoint (`ca.account.sony.com/api/v1/ssocookie`).
 */
export function openSonyPsnPage(
  step: 'playstation-login' | 'ssocookie' = 'ssocookie',
): void {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const url =
      step === 'playstation-login'
        ? 'https://www.playstation.com/'
        : 'https://ca.account.sony.com/api/v1/ssocookie';
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Starts the 1-Click OAuth2 PKCE login flow with `https://arctracker.io` via our backend proxy.
 */
export function startArcTrackerOAuthLogin(): void {
  if (typeof window !== 'undefined' && window.location) {
    window.location.assign('/api/auth/arctracker/oauth/start');
  }
}
