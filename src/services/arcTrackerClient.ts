import {
  DEMO_PLAYER_STATE,
  DEFAULT_LIVE_MAP_CONDITIONS,
  CATALOG_ITEMS,
  HIDEOUT_REQUIREMENTS,
  QUEST_REQUIREMENTS,
} from '../data/gameCatalog';
import type {
  AuthCredentials,
  EquippedLoadout,
  LiveMapCondition,
  PlayerProgressState,
  StashSlotItem,
} from '../shared/types';
import { DEFAULT_APP_KEY, DEMO_USER_API_KEY, saveAuthCredentials } from './authStore';

export const LAST_PLAYER_STATE_STORAGE_KEY = 'arc_mobile_last_player_state_v1';

const ARCTRACKER_PROXY_SYNC_URL = '/api/arctracker/sync';
const ARCTRACKER_UPSTREAM_BASE = 'https://arctracker.io/api/v2/user';
export const ARCTRACKER_V2_ENDPOINTS = [
  'profile',
  'stash',
  'loadout',
  'hideout',
  'quests',
  'projects',
  'blueprints',
] as const;
const METAFORGE_EVENT_TIMERS_URL = 'https://metaforge.app/api/arc-raiders/event-timers';
const DEFAULT_FETCH_TIMEOUT_MS = 4500;

/**
 * Returns a fresh realistic demo `PlayerProgressState` snapshot.
 */
export function createDemoPlayerProgressState(): PlayerProgressState {
  return {
    ...DEMO_PLAYER_STATE,
    stash: DEMO_PLAYER_STATE.stash.map((slot) => ({ ...slot })),
    loadout: {
      ...DEMO_PLAYER_STATE.loadout,
      quickUseItemIds: [...DEMO_PLAYER_STATE.loadout.quickUseItemIds],
      ammoStacks: DEMO_PLAYER_STATE.loadout.ammoStacks.map((s) => ({ ...s })),
    },
    hideoutLevels: { ...DEMO_PLAYER_STATE.hideoutLevels },
    completedQuestIds: [...DEMO_PLAYER_STATE.completedQuestIds],
    activeQuestIds: [...DEMO_PLAYER_STATE.activeQuestIds],
    completedProjectStages: { ...DEMO_PLAYER_STATE.completedProjectStages },
    learnedBlueprintIds: [...DEMO_PLAYER_STATE.learnedBlueprintIds],
    syncedAt: new Date().toISOString(),
    syncSource: 'demo-profile',
  };
}

/**
 * Returns a fresh copy of realistic default live map conditions and event timers.
 */
export function getDefaultLiveMapConditions(): LiveMapCondition[] {
  return DEFAULT_LIVE_MAP_CONDITIONS.map((cond) => ({
    ...cond,
    activeEvents: [...cond.activeEvents],
    bonusLootTags: [...cond.bonusLootTags],
  }));
}

export function saveCachedPlayerState(state: PlayerProgressState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_PLAYER_STATE_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage write errors
  }
}

export function loadCachedPlayerState(): PlayerProgressState | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(LAST_PLAYER_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProgressState>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.username !== 'string' ||
      !Array.isArray(parsed.stash)
    ) {
      return null;
    }
    return normalizePlayerState(parsed, parsed.syncSource ?? 'demo-profile');
  } catch {
    return null;
  }
}

function normalizeStash(rawStash: unknown): StashSlotItem[] {
  if (!Array.isArray(rawStash)) {
    return DEMO_PLAYER_STATE.stash;
  }
  const normalized: StashSlotItem[] = [];
  rawStash.forEach((entry, idx) => {
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const itemId =
        typeof record.itemId === 'string'
          ? record.itemId
          : typeof record.item_id === 'string'
            ? record.item_id
            : typeof record.id === 'string'
              ? record.id
              : null;
      const quantity =
        typeof record.quantity === 'number'
          ? record.quantity
          : typeof record.count === 'number'
            ? record.count
            : 1;
      const slotIndex =
        typeof record.slotIndex === 'number'
          ? record.slotIndex
          : typeof record.slot === 'number'
            ? record.slot
            : idx;

      if (itemId && quantity > 0) {
        normalized.push({
          slotIndex,
          itemId,
          quantity,
        });
      }
    }
  });
  return normalized.length > 0 ? normalized : DEMO_PLAYER_STATE.stash;
}

function normalizeLoadout(rawLoadout: unknown): EquippedLoadout {
  if (!rawLoadout || typeof rawLoadout !== 'object') {
    return DEMO_PLAYER_STATE.loadout;
  }
  const record = rawLoadout as Record<string, unknown>;
  return {
    primaryWeaponId:
      typeof record.primaryWeaponId === 'string' || record.primaryWeaponId === null
        ? (record.primaryWeaponId as string | null)
        : DEMO_PLAYER_STATE.loadout.primaryWeaponId,
    secondaryWeaponId:
      typeof record.secondaryWeaponId === 'string' || record.secondaryWeaponId === null
        ? (record.secondaryWeaponId as string | null)
        : DEMO_PLAYER_STATE.loadout.secondaryWeaponId,
    shieldId:
      typeof record.shieldId === 'string' || record.shieldId === null
        ? (record.shieldId as string | null)
        : DEMO_PLAYER_STATE.loadout.shieldId,
    augmentId:
      typeof record.augmentId === 'string' || record.augmentId === null
        ? (record.augmentId as string | null)
        : DEMO_PLAYER_STATE.loadout.augmentId,
    quickUseItemIds: Array.isArray(record.quickUseItemIds)
      ? record.quickUseItemIds.filter((id): id is string => typeof id === 'string')
      : DEMO_PLAYER_STATE.loadout.quickUseItemIds,
    ammoStacks: Array.isArray(record.ammoStacks)
      ? record.ammoStacks
          .filter(
            (stack): stack is { itemId: string; quantity: number } =>
              Boolean(stack) &&
              typeof stack === 'object' &&
              typeof (stack as { itemId?: unknown }).itemId === 'string' &&
              typeof (stack as { quantity?: unknown }).quantity === 'number',
          )
          .map((stack) => ({ itemId: stack.itemId, quantity: stack.quantity }))
      : DEMO_PLAYER_STATE.loadout.ammoStacks,
  };
}

function normalizePlayerState(
  raw: unknown,
  syncSource: PlayerProgressState['syncSource'],
): PlayerProgressState {
  const envelope =
    raw && typeof raw === 'object' && 'playerState' in (raw as Record<string, unknown>)
      ? ((raw as Record<string, unknown>).playerState as Record<string, unknown>)
      : raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
        ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
        : (raw as Record<string, unknown> | null | undefined);

  if (!envelope || typeof envelope !== 'object') {
    return {
      ...DEMO_PLAYER_STATE,
      syncedAt: new Date().toISOString(),
      syncSource,
    };
  }

  return {
    username:
      typeof envelope.username === 'string' && envelope.username.trim().length > 0
        ? envelope.username
        : DEMO_PLAYER_STATE.username,
    level:
      typeof envelope.level === 'number' && Number.isFinite(envelope.level)
        ? envelope.level
        : DEMO_PLAYER_STATE.level,
    raiderCoins:
      typeof envelope.raiderCoins === 'number' && Number.isFinite(envelope.raiderCoins)
        ? envelope.raiderCoins
        : DEMO_PLAYER_STATE.raiderCoins,
    stashCapacity:
      typeof envelope.stashCapacity === 'number' && Number.isFinite(envelope.stashCapacity)
        ? envelope.stashCapacity
        : DEMO_PLAYER_STATE.stashCapacity,
    stash: normalizeStash(envelope.stash),
    loadout: normalizeLoadout(envelope.loadout),
    hideoutLevels:
      envelope.hideoutLevels && typeof envelope.hideoutLevels === 'object'
        ? (envelope.hideoutLevels as Record<string, number>)
        : DEMO_PLAYER_STATE.hideoutLevels,
    completedQuestIds: Array.isArray(envelope.completedQuestIds)
      ? envelope.completedQuestIds.filter((id): id is string => typeof id === 'string')
      : DEMO_PLAYER_STATE.completedQuestIds,
    activeQuestIds: Array.isArray(envelope.activeQuestIds)
      ? envelope.activeQuestIds.filter((id): id is string => typeof id === 'string')
      : DEMO_PLAYER_STATE.activeQuestIds,
    completedProjectStages:
      envelope.completedProjectStages && typeof envelope.completedProjectStages === 'object'
        ? (envelope.completedProjectStages as Record<string, number>)
        : DEMO_PLAYER_STATE.completedProjectStages,
    learnedBlueprintIds: Array.isArray(envelope.learnedBlueprintIds)
      ? envelope.learnedBlueprintIds.filter((id): id is string => typeof id === 'string')
      : DEMO_PLAYER_STATE.learnedBlueprintIds,
    syncedAt:
      typeof envelope.syncedAt === 'string' && envelope.syncedAt.length > 0
        ? envelope.syncedAt
        : new Date().toISOString(),
    syncSource,
    ...(typeof envelope.platform === 'string'
      ? { platform: envelope.platform as 'ps5' | 'xbox' | 'pc' }
      : {}),
    ...(typeof envelope.embarkId === 'string' ? { embarkId: envelope.embarkId } : {}),
    ...(typeof envelope.psnOnlineId === 'string'
      ? { psnOnlineId: envelope.psnOnlineId }
      : {}),
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDirectArcTrackerV2(
  creds: AuthCredentials,
): Promise<PlayerProgressState | null> {
  const headers: Record<string, string> = {
    'X-App-Key': creds.appApiKey || DEFAULT_APP_KEY,
    Authorization: `Bearer ${creds.userApiKey}`,
    Accept: 'application/json',
  };

  const [
    profileRes,
    stashRes,
    loadoutRes,
    hideoutRes,
    questsRes,
    projectsRes,
    blueprintsRes,
  ] = await Promise.allSettled([
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/profile`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/stash`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/loadout`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/hideout`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/quests`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/projects`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/blueprints`, { method: 'GET', headers }),
  ]);

  let anySuccess = false;
  const combined: Record<string, unknown> = {};

  if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
    anySuccess = true;
    const profileJson = (await profileRes.value.json()) as Record<string, unknown>;
    Object.assign(combined, profileJson.data ?? profileJson);
  }

  if (stashRes.status === 'fulfilled' && stashRes.value.ok) {
    anySuccess = true;
    const stashJson = (await stashRes.value.json()) as Record<string, unknown>;
    if (Array.isArray(stashJson)) {
      combined.stash = stashJson;
    } else if (Array.isArray(stashJson.stash)) {
      combined.stash = stashJson.stash;
    } else if (Array.isArray(stashJson.items)) {
      combined.stash = stashJson.items;
    } else if (Array.isArray(stashJson.data)) {
      combined.stash = stashJson.data;
    } else {
      Object.assign(combined, stashJson);
    }
  }

  if (loadoutRes.status === 'fulfilled' && loadoutRes.value.ok) {
    anySuccess = true;
    const loadoutJson = (await loadoutRes.value.json()) as Record<string, unknown>;
    if (loadoutJson.loadout && typeof loadoutJson.loadout === 'object') {
      combined.loadout = loadoutJson.loadout;
    } else if (loadoutJson.data && typeof loadoutJson.data === 'object') {
      combined.loadout = loadoutJson.data;
    } else {
      combined.loadout = loadoutJson;
    }
  }

  if (hideoutRes.status === 'fulfilled' && hideoutRes.value.ok) {
    anySuccess = true;
    const hideoutJson = (await hideoutRes.value.json()) as Record<string, unknown>;
    if (hideoutJson.hideoutLevels && typeof hideoutJson.hideoutLevels === 'object') {
      combined.hideoutLevels = hideoutJson.hideoutLevels;
    } else if (hideoutJson.data && typeof hideoutJson.data === 'object' && !Array.isArray(hideoutJson.data)) {
      combined.hideoutLevels = hideoutJson.data;
    }
  }

  if (questsRes.status === 'fulfilled' && questsRes.value.ok) {
    anySuccess = true;
    const questsJson = (await questsRes.value.json()) as Record<string, unknown>;
    if (Array.isArray(questsJson.completedQuestIds)) {
      combined.completedQuestIds = questsJson.completedQuestIds;
    }
    if (Array.isArray(questsJson.activeQuestIds)) {
      combined.activeQuestIds = questsJson.activeQuestIds;
    }
  }

  if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
    anySuccess = true;
    const projectsJson = (await projectsRes.value.json()) as Record<string, unknown>;
    if (projectsJson.completedProjectStages && typeof projectsJson.completedProjectStages === 'object') {
      combined.completedProjectStages = projectsJson.completedProjectStages;
    }
  }

  if (blueprintsRes.status === 'fulfilled' && blueprintsRes.value.ok) {
    anySuccess = true;
    const blueprintsJson = (await blueprintsRes.value.json()) as Record<string, unknown>;
    if (Array.isArray(blueprintsJson)) {
      combined.learnedBlueprintIds = blueprintsJson;
    } else if (Array.isArray(blueprintsJson.learnedBlueprintIds)) {
      combined.learnedBlueprintIds = blueprintsJson.learnedBlueprintIds;
    } else if (Array.isArray(blueprintsJson.data)) {
      combined.learnedBlueprintIds = blueprintsJson.data;
    }
  }

  if (!anySuccess) {
    return null;
  }

  return normalizePlayerState(combined, 'arctracker-live');
}

/**
 * Syncs the player's stash, loadout, hideout levels, and quests from ARC Tracker.
 * Caches the last synced `PlayerProgressState` in `localStorage` (`arc_mobile_last_player_state_v1`).
 * Falls back cleanly to cached state or `DEMO_PLAYER_STATE` when offline or in demo mode.
 */
export async function syncPlayerState(
  creds: AuthCredentials | null,
): Promise<PlayerProgressState> {
  if (
    creds &&
    (creds.source === 'psn-npsso' ||
      creds.source === 'embark-session' ||
      creds.source === 'console-vision')
  ) {
    const cachedConsole = loadCachedPlayerState();
    const baseState = cachedConsole ?? createDemoPlayerProgressState();
    const consoleState: PlayerProgressState = {
      ...baseState,
      username:
        creds.embarkId ||
        creds.psnOnlineId ||
        (baseState.username !== DEMO_PLAYER_STATE.username
          ? baseState.username
          : 'PS5_Raider'),
      platform: 'ps5',
      embarkId: creds.embarkId ?? baseState.embarkId,
      psnOnlineId: creds.psnOnlineId ?? baseState.psnOnlineId,
      syncSource:
        creds.source === 'console-vision' || baseState.syncSource === 'console-vision-sync'
          ? 'console-vision-sync'
          : 'psn-embark-bridge',
      syncedAt: new Date().toISOString(),
    };
    saveCachedPlayerState(consoleState);
    return consoleState;
  }

  const userKey = creds?.userApiKey?.trim() ?? '';
  const appKey = creds?.appApiKey?.trim() || DEFAULT_APP_KEY;
  const isLiveKey =
    (userKey.startsWith('arc_u1_') || creds?.source === 'oauth-pkce') &&
    userKey.length > 8 &&
    userKey !== DEMO_USER_API_KEY &&
    creds?.source !== 'demo';

  if (!isLiveKey) {
    const demoState: PlayerProgressState = {
      ...DEMO_PLAYER_STATE,
      syncedAt: new Date().toISOString(),
      syncSource: 'demo-profile',
    };
    saveCachedPlayerState(demoState);
    return demoState;
  }

  // 1. Attempt local proxy POST /api/arctracker/sync
  try {
    const proxyRes = await fetchWithTimeout(ARCTRACKER_PROXY_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': appKey,
        Authorization: `Bearer ${userKey}`,
      },
      body: JSON.stringify({
        userApiKey: userKey,
        appApiKey: appKey,
      }),
    });

    if (proxyRes.ok) {
      const payload = await proxyRes.json();
      const liveState = normalizePlayerState(payload, 'arctracker-live');
      saveCachedPlayerState(liveState);
      return liveState;
    }
  } catch {
    // Proxy unavailable or network error; fall through to direct upstream v2 endpoints
  }

  // 2. Fallback direct GET https://arctracker.io/api/v2/user/{stash,profile,loadout}
  try {
    const directState = await fetchDirectArcTrackerV2({
      userApiKey: userKey,
      appApiKey: appKey,
      savedAt: creds?.savedAt ?? new Date().toISOString(),
      source: creds?.source ?? 'manual',
    });

    if (directState) {
      saveCachedPlayerState(directState);
      return directState;
    }
  } catch {
    // Upstream error; fall back to cached state or demo state
  }

  // 3. Offline / upstream error fallback: return cached state if present, else DEMO_PLAYER_STATE
  const cached = loadCachedPlayerState();
  if (cached) {
    return cached;
  }

  const fallbackDemo: PlayerProgressState = {
    ...DEMO_PLAYER_STATE,
    syncedAt: new Date().toISOString(),
    syncSource: 'demo-profile',
  };
  saveCachedPlayerState(fallbackDemo);
  return fallbackDemo;
}

function normalizeHazardLevel(value: unknown): LiveMapCondition['hazardLevel'] {
  if (
    value === 'Low' ||
    value === 'Moderate' ||
    value === 'High' ||
    value === 'Extreme'
  ) {
    return value;
  }
  return 'High';
}

function mapRawEventsToConditions(raw: unknown): LiveMapCondition[] {
  const candidates = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : raw && typeof raw === 'object' && Array.isArray((raw as { events?: unknown }).events)
        ? (raw as { events: unknown[] }).events
        : raw && typeof raw === 'object' && Array.isArray((raw as { timers?: unknown }).timers)
          ? (raw as { timers: unknown[] }).timers
          : null;

  if (!candidates || candidates.length === 0) {
    return DEFAULT_LIVE_MAP_CONDITIONS;
  }

  const mapped: LiveMapCondition[] = [];
  for (const item of candidates) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const mapName =
      typeof record.mapName === 'string'
        ? record.mapName
        : typeof record.map === 'string'
          ? record.map
          : typeof record.location === 'string'
            ? record.location
            : null;
    if (!mapName) {
      continue;
    }

    const mapSlug =
      typeof record.mapSlug === 'string'
        ? record.mapSlug
        : mapName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const activeCondition =
      typeof record.activeCondition === 'string'
        ? record.activeCondition
        : typeof record.condition === 'string'
          ? record.condition
          : typeof record.eventName === 'string'
            ? record.eventName
            : typeof record.name === 'string'
              ? record.name
              : 'Standard Patrol';

    const activeEvents = Array.isArray(record.activeEvents)
      ? record.activeEvents.filter((e): e is string => typeof e === 'string')
      : typeof record.eventName === 'string'
        ? [record.eventName]
        : [activeCondition];

    const bonusLootTags = Array.isArray(record.bonusLootTags)
      ? record.bonusLootTags.filter((t): t is string => typeof t === 'string')
      : ['ARC Components', 'High-Tier Salvage'];

    const expiresInMinutes =
      typeof record.expiresInMinutes === 'number'
        ? record.expiresInMinutes
        : typeof record.remainingMinutes === 'number'
          ? record.remainingMinutes
          : 25;

    mapped.push({
      mapSlug,
      mapName,
      activeCondition,
      hazardLevel: normalizeHazardLevel(record.hazardLevel),
      activeEvents,
      bonusLootTags,
      expiresInMinutes,
    });
  }

  return mapped.length > 0 ? mapped : DEFAULT_LIVE_MAP_CONDITIONS;
}

/**
 * Attempts to fetch live map conditions and event timers from MetaForge with a short timeout,
 * falling back cleanly to `DEFAULT_LIVE_MAP_CONDITIONS`.
 */
export async function fetchLiveMapConditions(): Promise<LiveMapCondition[]> {
  try {
    const response = await fetchWithTimeout(
      METAFORGE_EVENT_TIMERS_URL,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      3000,
    );

    if (!response.ok) {
      return DEFAULT_LIVE_MAP_CONDITIONS;
    }

    const payload = await response.json();
    return mapRawEventsToConditions(payload);
  } catch {
    return DEFAULT_LIVE_MAP_CONDITIONS;
  }
}

/**
 * Connects a PlayStation 5 player's Embark ID session token (`https://id.embark.games/api/auth/session`)
 * and resolves their Embark ID (`Name#1234`) + linked PlayStation Network Online ID.
 */
export async function connectEmbarkPlayStationSession(
  rawSessionTokenOrJson: string,
  currentState?: PlayerProgressState,
): Promise<{
  ok: boolean;
  credentials?: AuthCredentials;
  playerState?: PlayerProgressState;
  embarkId?: string;
  psnOnlineId?: string;
  error?: string;
}> {
  try {
    const res = await fetchWithTimeout(
      '/api/auth/embark/resolve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: rawSessionTokenOrJson }),
      },
      12000,
    );
    const data = (await res.json()) as {
      ok?: boolean;
      embarkId?: string;
      psnOnlineId?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || 'Could not resolve Embark PlayStation session.',
      };
    }

    const creds = saveAuthCredentials({
      userApiKey: `arc_u1_embark_${(data.embarkId || 'ps5').replace(/[^A-Za-z0-9]/g, '_')}`,
      appApiKey: DEFAULT_APP_KEY,
      savedAt: new Date().toISOString(),
      source: 'embark-session',
      embarkAccessToken: rawSessionTokenOrJson.trim(),
      embarkId: data.embarkId,
      psnOnlineId: data.psnOnlineId,
    });

    const base = currentState ?? loadCachedPlayerState() ?? createDemoPlayerProgressState();
    const updatedState: PlayerProgressState = {
      ...base,
      username: data.psnOnlineId
        ? `${data.psnOnlineId} (${data.embarkId || 'Embark'})`
        : data.embarkId || base.username,
      platform: 'ps5',
      embarkId: data.embarkId,
      psnOnlineId: data.psnOnlineId,
      syncSource: 'psn-embark-bridge',
      syncedAt: new Date().toISOString(),
    };
    saveCachedPlayerState(updatedState);

    return {
      ok: true,
      credentials: creds,
      playerState: updatedState,
      embarkId: data.embarkId,
      psnOnlineId: data.psnOnlineId,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error connecting Embark session.',
    };
  }
}

/**
 * Connects a PlayStation 5 player's Sony `npsso` token (`ca.account.sony.com/api/v1/ssocookie`)
 * via Sony PSN Mobile OAuth + Embark ID PlayStation Federated Handshake.
 */
export async function connectSonyPsnNpssoBridge(
  rawNpssoInput: string,
  currentState?: PlayerProgressState,
): Promise<{
  ok: boolean;
  credentials?: AuthCredentials;
  playerState?: PlayerProgressState;
  psnOnlineId?: string;
  embarkId?: string;
  error?: string;
}> {
  try {
    const res = await fetchWithTimeout(
      '/api/auth/playstation/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npsso: rawNpssoInput }),
      },
      15000,
    );
    const data = (await res.json()) as {
      ok?: boolean;
      psnOnlineId?: string;
      embarkId?: string;
      embarkAccessToken?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || 'Could not verify PlayStation NPSSO token.',
      };
    }

    const creds = saveAuthCredentials({
      userApiKey: `arc_u1_psn_${(data.psnOnlineId || 'raider').replace(/[^A-Za-z0-9]/g, '_')}`,
      appApiKey: DEFAULT_APP_KEY,
      savedAt: new Date().toISOString(),
      source: 'psn-npsso',
      psnNpsso: rawNpssoInput.trim(),
      embarkAccessToken: data.embarkAccessToken,
      embarkId: data.embarkId,
      psnOnlineId: data.psnOnlineId,
    });

    const base = currentState ?? loadCachedPlayerState() ?? createDemoPlayerProgressState();
    const updatedState: PlayerProgressState = {
      ...base,
      username: data.psnOnlineId || data.embarkId || base.username,
      platform: 'ps5',
      embarkId: data.embarkId,
      psnOnlineId: data.psnOnlineId,
      syncSource: 'psn-embark-bridge',
      syncedAt: new Date().toISOString(),
    };
    saveCachedPlayerState(updatedState);

    return {
      ok: true,
      credentials: creds,
      playerState: updatedState,
      psnOnlineId: data.psnOnlineId,
      embarkId: data.embarkId,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error during PlayStation NPSSO sync.',
    };
  }
}

function buildCompactCatalogDigest(): string {
  const itemLines = CATALOG_ITEMS.map(
    (item) => `${item.id}: "${item.name}" (${item.category}, ${item.rarity})`,
  ).join('; ');
  const stationIds = Array.from(
    new Set(HIDEOUT_REQUIREMENTS.map((h) => `${h.stationId} ("${h.stationName}")`)),
  ).join(', ');
  const questLines = QUEST_REQUIREMENTS.map(
    (q) => `${q.questId}: "${q.questName}" (${q.traderName})`,
  ).join('; ');
  return `Canonical Catalog Item IDs: [${itemLines}]\nCanonical Hideout Stations: [${stationIds}]\nCanonical Quests: [${questLines}]`;
}

/**
 * Syncs a PlayStation 5 / Console player's Stash, Loadout, Workshop Station Levels, and Quests
 * using Azure AI Foundry `gpt-6-astra` Multimodal Vision (TV photo / PS App screenshot) or Voice/Text!
 */
export async function syncConsoleStateWithFoundryAi(options: {
  imageDataUrl?: string;
  transcript?: string;
  currentState: PlayerProgressState;
}): Promise<{
  ok: boolean;
  summary: string;
  updatedState: PlayerProgressState;
  credentials?: AuthCredentials;
  error?: string;
}> {
  try {
    const res = await fetchWithTimeout(
      '/api/foundry/console-sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: options.imageDataUrl,
          transcript: options.transcript,
          catalogDigest: buildCompactCatalogDigest(),
        }),
      },
      30000,
    );

    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      patch?: {
        summary?: string;
        detectedUsername?: string | null;
        detectedLevel?: number | null;
        detectedCoins?: number | null;
        stashUpdates?: Array<{
          itemId?: string;
          quantity?: number;
          mode?: string;
        }>;
        loadoutUpdates?: Partial<EquippedLoadout>;
        hideoutLevelUpdates?: Record<string, number>;
        completedQuestIdsToAdd?: string[];
        activeQuestIdsToAdd?: string[];
      };
    };

    if (!res.ok || !data.ok || !data.patch) {
      return {
        ok: false,
        summary: '',
        updatedState: options.currentState,
        error: data.error || 'Foundry Console AI Sync failed.',
      };
    }

    const patch = data.patch;
    const validItemIds = new Set(CATALOG_ITEMS.map((i) => i.id));
    const nextStashMap = new Map<string, number>();
    for (const slot of options.currentState.stash) {
      nextStashMap.set(slot.itemId, (nextStashMap.get(slot.itemId) ?? 0) + slot.quantity);
    }

    if (Array.isArray(patch.stashUpdates)) {
      for (const upd of patch.stashUpdates) {
        if (
          upd &&
          typeof upd.itemId === 'string' &&
          validItemIds.has(upd.itemId) &&
          typeof upd.quantity === 'number' &&
          Number.isFinite(upd.quantity)
        ) {
          if (upd.mode === 'add') {
            nextStashMap.set(
              upd.itemId,
              Math.max(0, (nextStashMap.get(upd.itemId) ?? 0) + upd.quantity),
            );
          } else {
            if (upd.quantity <= 0) {
              nextStashMap.delete(upd.itemId);
            } else {
              nextStashMap.set(upd.itemId, upd.quantity);
            }
          }
        }
      }
    }

    const nextStash: StashSlotItem[] = Array.from(nextStashMap.entries()).map(
      ([itemId, quantity], idx) => ({
        slotIndex: idx,
        itemId,
        quantity,
      }),
    );

    const nextLoadout: EquippedLoadout = {
      ...options.currentState.loadout,
    };
    if (patch.loadoutUpdates && typeof patch.loadoutUpdates === 'object') {
      if (
        typeof patch.loadoutUpdates.primaryWeaponId === 'string' &&
        validItemIds.has(patch.loadoutUpdates.primaryWeaponId)
      ) {
        nextLoadout.primaryWeaponId = patch.loadoutUpdates.primaryWeaponId;
      }
      if (
        typeof patch.loadoutUpdates.secondaryWeaponId === 'string' &&
        validItemIds.has(patch.loadoutUpdates.secondaryWeaponId)
      ) {
        nextLoadout.secondaryWeaponId = patch.loadoutUpdates.secondaryWeaponId;
      }
      if (
        typeof patch.loadoutUpdates.shieldId === 'string' &&
        validItemIds.has(patch.loadoutUpdates.shieldId)
      ) {
        nextLoadout.shieldId = patch.loadoutUpdates.shieldId;
      }
      if (
        typeof patch.loadoutUpdates.augmentId === 'string' &&
        validItemIds.has(patch.loadoutUpdates.augmentId)
      ) {
        nextLoadout.augmentId = patch.loadoutUpdates.augmentId;
      }
    }

    const nextHideout: Record<string, number> = {
      ...options.currentState.hideoutLevels,
    };
    if (patch.hideoutLevelUpdates && typeof patch.hideoutLevelUpdates === 'object') {
      for (const [stationId, lvl] of Object.entries(patch.hideoutLevelUpdates)) {
        if (typeof lvl === 'number' && lvl >= 0 && lvl <= 5) {
          nextHideout[stationId] = lvl;
        }
      }
    }

    const completedSet = new Set(options.currentState.completedQuestIds);
    if (Array.isArray(patch.completedQuestIdsToAdd)) {
      for (const qId of patch.completedQuestIdsToAdd) {
        if (typeof qId === 'string') {
          completedSet.add(qId);
        }
      }
    }

    const activeSet = new Set(options.currentState.activeQuestIds);
    if (Array.isArray(patch.activeQuestIdsToAdd)) {
      for (const qId of patch.activeQuestIdsToAdd) {
        if (typeof qId === 'string' && !completedSet.has(qId)) {
          activeSet.add(qId);
        }
      }
    }

    const updatedState: PlayerProgressState = {
      ...options.currentState,
      username:
        typeof patch.detectedUsername === 'string' && patch.detectedUsername.trim()
          ? patch.detectedUsername.trim()
          : options.currentState.username !== DEMO_PLAYER_STATE.username
            ? options.currentState.username
            : 'PS5_Raider',
      level:
        typeof patch.detectedLevel === 'number' && patch.detectedLevel > 0
          ? patch.detectedLevel
          : options.currentState.level,
      raiderCoins:
        typeof patch.detectedCoins === 'number' && patch.detectedCoins >= 0
          ? patch.detectedCoins
          : options.currentState.raiderCoins,
      stash: nextStash,
      loadout: nextLoadout,
      hideoutLevels: nextHideout,
      completedQuestIds: Array.from(completedSet),
      activeQuestIds: Array.from(activeSet),
      platform: 'ps5',
      syncSource: 'console-vision-sync',
      syncedAt: new Date().toISOString(),
    };

    saveCachedPlayerState(updatedState);

    const creds = saveAuthCredentials({
      userApiKey: `arc_u1_ps5_vision_${Date.now().toString(36)}`,
      appApiKey: DEFAULT_APP_KEY,
      savedAt: new Date().toISOString(),
      source: 'console-vision',
      psnOnlineId: updatedState.psnOnlineId || updatedState.username,
      embarkId: updatedState.embarkId,
    });

    return {
      ok: true,
      summary:
        patch.summary ||
        `Synced ${nextStash.length} stash stacks and workshop levels via Azure AI Foundry (gpt-6-astra).`,
      updatedState,
      credentials: creds,
    };
  } catch (err) {
    return {
      ok: false,
      summary: '',
      updatedState: options.currentState,
      error: err instanceof Error ? err.message : 'Console AI Sync request failed.',
    };
  }
}
