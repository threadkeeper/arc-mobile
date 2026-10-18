import {
  DEMO_PLAYER_STATE,
  DEFAULT_LIVE_MAP_CONDITIONS,
} from '../data/gameCatalog';
import type {
  AuthCredentials,
  EquippedLoadout,
  LiveMapCondition,
  PlayerProgressState,
  StashSlotItem,
} from '../shared/types';
import { DEFAULT_APP_KEY, DEMO_USER_API_KEY } from './authStore';

export const LAST_PLAYER_STATE_STORAGE_KEY = 'arc_mobile_last_player_state_v1';

const ARCTRACKER_PROXY_SYNC_URL = '/api/arctracker/sync';
const ARCTRACKER_UPSTREAM_BASE = 'https://arctracker.io/api/v2/user';
const METAFORGE_EVENT_TIMERS_URL = 'https://metaforge.app/api/arc-raiders/event-timers';
const DEFAULT_FETCH_TIMEOUT_MS = 4500;

function saveCachedPlayerState(state: PlayerProgressState): void {
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

  const [stashRes, profileRes, loadoutRes] = await Promise.allSettled([
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/stash`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/profile`, { method: 'GET', headers }),
    fetchWithTimeout(`${ARCTRACKER_UPSTREAM_BASE}/loadout`, { method: 'GET', headers }),
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
  const userKey = creds?.userApiKey?.trim() ?? '';
  const appKey = creds?.appApiKey?.trim() || DEFAULT_APP_KEY;
  const isLiveKey =
    userKey.startsWith('arc_u1_') &&
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
