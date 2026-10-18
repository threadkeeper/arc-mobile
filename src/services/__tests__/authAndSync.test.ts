import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_COOKIE_NAME,
  AUTH_STORAGE_KEY,
  DEFAULT_APP_KEY,
  clearAuthCredentials,
  extractKeysFromText,
  loadAuthCredentials,
  openArcTrackerKeyPage,
  pullAuthFromBrowserEnvironment,
  saveAuthCredentials,
} from '../authStore';
import {
  LAST_PLAYER_STATE_STORAGE_KEY,
  fetchLiveMapConditions,
  syncPlayerState,
} from '../arcTrackerClient';
import { getStaticGameCatalogSummary } from '../gameCatalogClient';
import {
  DEFAULT_LIVE_MAP_CONDITIONS,
  DEMO_PLAYER_STATE,
} from '../../data/gameCatalog';
import type { AuthCredentials } from '../../shared/types';

describe('authStore & arcTrackerClient unit tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
    window.history.replaceState({}, '', '/');
    window.name = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearAuthCredentials();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves and loads AuthCredentials in both localStorage and backup cookie', () => {
    const input: AuthCredentials = {
      userApiKey: 'arc_u1_speranza_veteran_99',
      appApiKey: 'arc_k1_custom_companion_key',
      savedAt: '2026-10-18T12:00:00.000Z',
      source: 'manual',
    };

    const saved = saveAuthCredentials(input);
    expect(saved).toEqual(input);

    const rawLocal = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(rawLocal).not.toBeNull();
    expect(JSON.parse(rawLocal!)).toEqual(input);
    expect(document.cookie).toContain(AUTH_COOKIE_NAME);

    const loaded = loadAuthCredentials();
    expect(loaded).toEqual(input);
  });

  it('automatically recovers AuthCredentials from backup cookie when localStorage is wiped', () => {
    const input: AuthCredentials = {
      userApiKey: 'arc_u1_cookie_survivor_777',
      appApiKey: DEFAULT_APP_KEY,
      savedAt: '2026-10-18T14:30:00.000Z',
      source: 'browser-pull',
    };

    saveAuthCredentials(input);

    // Simulate user or browser wiping localStorage while cookie persists
    localStorage.removeItem(AUTH_STORAGE_KEY);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();

    const recovered = loadAuthCredentials();
    expect(recovered).toEqual(input);

    // Verify localStorage was automatically self-healed from cookie
    const restoredLocal = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(restoredLocal).not.toBeNull();
    expect(JSON.parse(restoredLocal!)).toEqual(input);
  });

  it('extracts arc_u1_ and arc_k1_ keys from URL query/hash, JSON blobs, and raw text', () => {
    // 1. URL query and hash
    const fromUrl = extractKeysFromText(
      'https://arctracker.io/settings?userKey=arc_u1_url_raider_42&appKey=arc_k1_mobile_app_01#sync',
    );
    expect(fromUrl).toEqual({
      userApiKey: 'arc_u1_url_raider_42',
      appApiKey: 'arc_k1_mobile_app_01',
    });

    // 2. JSON blob
    const fromJson = extractKeysFromText(
      JSON.stringify({
        profile: 'RaiderOne',
        apiKey: 'arc_u1_json_token_abc-123',
        clientKey: 'arc_k1_json_app_xyz_987',
      }),
    );
    expect(fromJson).toEqual({
      userApiKey: 'arc_u1_json_token_abc-123',
      appApiKey: 'arc_k1_json_app_xyz_987',
    });

    // 3. Raw pasted text with only user key
    const fromRaw = extractKeysFromText(
      'Here is my personal key from ARC Tracker settings: arc_u1_raw_pasted_key_2026!',
    );
    expect(fromRaw).toEqual({
      userApiKey: 'arc_u1_raw_pasted_key_2026',
    });

    // 4. Empty / unrelated text
    expect(extractKeysFromText('no valid keys here')).toEqual({});
  });

  it('pulls auth from URL parameters first, then clipboard in pullAuthFromBrowserEnvironment', async () => {
    // Case A: URL search/hash contains key
    window.history.replaceState(
      {},
      '',
      '/?key=arc_u1_from_query_param_88#app=arc_k1_from_hash_11',
    );

    const pulledFromUrl = await pullAuthFromBrowserEnvironment();
    expect(pulledFromUrl).not.toBeNull();
    expect(pulledFromUrl?.userApiKey).toBe('arc_u1_from_query_param_88');
    expect(pulledFromUrl?.appApiKey).toBe('arc_k1_from_hash_11');
    expect(pulledFromUrl?.source).toBe('url-param');
    expect(loadAuthCredentials()?.userApiKey).toBe('arc_u1_from_query_param_88');

    // Reset URL and test Case B: navigator.clipboard.readText()
    clearAuthCredentials();
    window.history.replaceState({}, '', '/');

    const readTextMock = vi
      .fn()
      .mockResolvedValue('Copied key: arc_u1_clipboard_raider_555');
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: readTextMock },
      configurable: true,
    });

    const pulledFromClipboard = await pullAuthFromBrowserEnvironment();
    expect(readTextMock).toHaveBeenCalledTimes(1);
    expect(pulledFromClipboard).not.toBeNull();
    expect(pulledFromClipboard?.userApiKey).toBe('arc_u1_clipboard_raider_555');
    expect(pulledFromClipboard?.appApiKey).toBe(DEFAULT_APP_KEY);
    expect(pulledFromClipboard?.source).toBe('clipboard');
  });

  it('opens ARC Tracker settings in a new tab via openArcTrackerKeyPage', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    openArcTrackerKeyPage();
    expect(openSpy).toHaveBeenCalledWith(
      'https://arctracker.io/settings',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('syncs player state via proxy or falls back cleanly to DEMO_PLAYER_STATE and caches in localStorage', async () => {
    // 1. Demo mode / null credentials returns DEMO_PLAYER_STATE and caches it
    const demoState = await syncPlayerState(null);
    expect(demoState.username).toBe(DEMO_PLAYER_STATE.username);
    expect(demoState.syncSource).toBe('demo-profile');
    expect(localStorage.getItem(LAST_PLAYER_STATE_STORAGE_KEY)).not.toBeNull();

    // 2. Live key with successful proxy response
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          username: 'LiveRaider_Valkyrie',
          level: 41,
          raiderCoins: 128500,
          stashCapacity: 120,
          stash: [{ slotIndex: 0, itemId: 'tempest_ar', quantity: 1 }],
          loadout: DEMO_PLAYER_STATE.loadout,
          hideoutLevels: { gunsmith: 3 },
          completedQuestIds: ['quest_clear_sky'],
          activeQuestIds: ['quest_rocketeer_blackbox'],
          completedProjectStages: { proj_expedition: 2 },
          learnedBlueprintIds: ['bp_tempest_ar'],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const liveCreds: AuthCredentials = {
      userApiKey: 'arc_u1_live_raider_token_9000',
      appApiKey: DEFAULT_APP_KEY,
      savedAt: new Date().toISOString(),
      source: 'manual',
    };

    const syncedLive = await syncPlayerState(liveCreds);
    expect(fetchMock).toHaveBeenCalled();
    expect(syncedLive.username).toBe('LiveRaider_Valkyrie');
    expect(syncedLive.level).toBe(41);
    expect(syncedLive.syncSource).toBe('arctracker-live');

    // 3. Offline / upstream failure falls back to cached player state
    fetchMock.mockRejectedValue(new Error('Network offline'));
    const offlineFallback = await syncPlayerState(liveCreds);
    expect(offlineFallback.username).toBe('LiveRaider_Valkyrie');
  });

  it('fetches live map conditions with fallback to DEFAULT_LIVE_MAP_CONDITIONS and builds catalog summary', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));
    const conditions = await fetchLiveMapConditions();
    expect(conditions).toEqual(DEFAULT_LIVE_MAP_CONDITIONS);

    const summary = getStaticGameCatalogSummary();
    expect(summary).toContain('ARC RAIDERS STATIC GAME CATALOG DIGEST');
    expect(summary).toContain('ITEMS, RECYCLE YIELDS & DROP ZONES');
  });
});
