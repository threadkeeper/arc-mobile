import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_COOKIE_NAME,
  AUTH_STORAGE_KEY,
  DEFAULT_APP_KEY,
  clearAuthCredentials,
  exportAuthCredentialsBackup,
  extractArcKeyFromText,
  extractKeysFromText,
  importAuthCredentialsBackup,
  loadAuthCredentials,
  openArcTrackerKeyPage,
  pullAuthFromBrowserEnvironment,
  saveAuthCredentials,
} from '../authStore';
import {
  ARCTRACKER_V2_ENDPOINTS,
  LAST_PLAYER_STATE_STORAGE_KEY,
  createDemoPlayerProgressState,
  fetchLiveMapConditions,
  getDefaultLiveMapConditions,
  syncConsoleStateWithFoundryAi,
  syncPlayerState,
} from '../arcTrackerClient';
import {
  getCatalogItemById,
  getStaticGameCatalogSummary,
  mergeRemoteCatalogEnrichment,
  searchCatalogItems,
} from '../gameCatalogClient';
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

  it('saves and loads AuthCredentials in both localStorage and 365-day backup cookie (arc_raiders_auth_backup)', () => {
    const input: AuthCredentials = {
      userApiKey: 'arc_u1_speranza_veteran_99',
      appApiKey: 'arc_k1_custom_companion_key',
      savedAt: '2026-10-18T12:00:00.000Z',
      source: 'manual',
    };

    expect(AUTH_COOKIE_NAME).toBe('arc_raiders_auth_backup');

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

  it('exports and imports JSON token backups cleanly', () => {
    const original: AuthCredentials = {
      userApiKey: 'arc_u1_backup_raider_303',
      appApiKey: 'arc_k1_backup_app_909',
      savedAt: '2026-10-18T15:00:00.000Z',
      source: 'manual',
    };

    const jsonBackup = exportAuthCredentialsBackup(original);
    expect(jsonBackup).toContain('arc_u1_backup_raider_303');

    clearAuthCredentials();
    expect(loadAuthCredentials()).toBeNull();

    const restored = importAuthCredentialsBackup(jsonBackup);
    expect(restored).not.toBeNull();
    expect(restored?.userApiKey).toBe('arc_u1_backup_raider_303');
    expect(restored?.appApiKey).toBe('arc_k1_backup_app_909');
    expect(loadAuthCredentials()?.userApiKey).toBe('arc_u1_backup_raider_303');
  });

  it('extracts arc_u1_ and arc_k1_ keys from URL query/hash, JSON blobs, and raw text', () => {
    // 1. URL query and hash
    const fromUrl = extractKeysFromText(
      'https://arctracker.io/settings?arcKey=arc_u1_url_raider_42&appKey=arc_k1_mobile_app_01#sync',
    );
    expect(fromUrl).toEqual({
      userApiKey: 'arc_u1_url_raider_42',
      appApiKey: 'arc_k1_mobile_app_01',
    });
    expect(extractArcKeyFromText('#arc_u1_hash_token_88')).toBe(
      'arc_u1_hash_token_88',
    );

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
    expect(extractArcKeyFromText('no valid keys here')).toBeNull();
  });

  it('pulls auth from URL parameters first, then clipboard in pullAuthFromBrowserEnvironment', async () => {
    // Case A: URL search/hash contains key
    window.history.replaceState(
      {},
      '',
      '/?arcKey=arc_u1_from_query_param_88#app=arc_k1_from_hash_11',
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

  it('syncs player state via proxy or direct v2 endpoints, falling back cleanly to DEMO_PLAYER_STATE', async () => {
    // 1. Demo mode / null credentials returns DEMO_PLAYER_STATE and caches it
    const demoSnapshot = createDemoPlayerProgressState();
    expect(demoSnapshot.username).toBe(DEMO_PLAYER_STATE.username);

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

    // 3. Direct ARC Tracker v2 fallback when proxy returns 502
    expect(ARCTRACKER_V2_ENDPOINTS).toEqual([
      'profile',
      'stash',
      'loadout',
      'hideout',
      'quests',
      'projects',
      'blueprints',
    ]);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/arctracker/sync')) {
        return new Response('Bad Gateway', { status: 502 });
      }
      if (url.endsWith('/profile')) {
        return new Response(
          JSON.stringify({ username: 'DirectV2_Raider', level: 50, raiderCoins: 99000 }),
          { status: 200 },
        );
      }
      if (url.endsWith('/hideout')) {
        return new Response(
          JSON.stringify({ hideoutLevels: { gunsmith: 3, refiner: 3 } }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const directV2Synced = await syncPlayerState(liveCreds);
    expect(directV2Synced.username).toBe('DirectV2_Raider');
    expect(directV2Synced.hideoutLevels.gunsmith).toBe(3);

    // 4. Offline / upstream failure falls back to cached player state
    fetchMock.mockRejectedValue(new Error('Network offline'));
    const offlineFallback = await syncPlayerState(liveCreds);
    expect(offlineFallback.username).toBe('DirectV2_Raider');
  });

  it('fetches live map conditions from MetaForge with fallback to getDefaultLiveMapConditions and builds catalog summary', async () => {
    // 1. Online MetaForge response
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          events: [
            {
              mapName: 'The Spaceport',
              activeCondition: 'Harvester Queen Event',
              hazardLevel: 'Extreme',
              activeEvents: ['Harvester Landing'],
              bonusLootTags: ['Queen Core'],
              expiresInMinutes: 18,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const liveConditions = await fetchLiveMapConditions();
    expect(liveConditions).toHaveLength(1);
    expect(liveConditions[0].mapName).toBe('The Spaceport');
    expect(liveConditions[0].activeCondition).toBe('Harvester Queen Event');

    // 2. Offline fallback
    fetchSpy.mockRejectedValueOnce(new Error('Timeout'));
    const fallbackConditions = await fetchLiveMapConditions();
    expect(fallbackConditions).toEqual(DEFAULT_LIVE_MAP_CONDITIONS);
    expect(getDefaultLiveMapConditions()).toEqual(DEFAULT_LIVE_MAP_CONDITIONS);

    // 3. Catalog helpers & summary
    expect(getCatalogItemById('rattler_ar')?.name).toContain('Rattler');
    expect(searchCatalogItems('leaper').length).toBeGreaterThan(0);
    const enriched = mergeRemoteCatalogEnrichment([
      { id: 'rattler_ar', sellValueCoins: 1100 },
    ]);
    expect(enriched.find((i) => i.id === 'rattler_ar')?.sellValueCoins).toBe(1100);

    const summary = getStaticGameCatalogSummary();
    expect(summary).toContain('ARC RAIDERS STATIC GAME CATALOG DIGEST');
    expect(summary).toContain('ITEMS, RECYCLE YIELDS & DROP ZONES');
  });

  it('extracts PlayStation NPSSO tokens, Embark JWTs, and syncs PS5 state via syncConsoleStateWithFoundryAi', async () => {
    const sampleNpsso =
      '{"npsso":"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2"}';
    const extractedNpsso = extractKeysFromText(sampleNpsso);
    expect(extractedNpsso.psnNpsso).toBe(
      'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2',
    );

    const sampleEmbarkJwt =
      '{"accessToken":"eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJwc24tMTIzIn0.signature123"}';
    const extractedJwt = extractKeysFromText(sampleEmbarkJwt);
    expect(extractedJwt.embarkAccessToken).toBe(
      'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJwc24tMTIzIn0.signature123',
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          modelUsed: 'gpt-6-astra',
          patch: {
            summary: 'Synced PS5 Stash: 4 Leaper Pulse Units and Gunsmith L3.',
            detectedUsername: 'GhostRaider_PS5',
            detectedLevel: 29,
            detectedCoins: 42000,
            stashUpdates: [
              { itemId: 'leaper_pulse_unit', quantity: 4, mode: 'set' },
            ],
            hideoutLevelUpdates: { gunsmith: 3 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const baseState = createDemoPlayerProgressState();
    const syncRes = await syncConsoleStateWithFoundryAi({
      transcript: 'PS5: I have 4 Leaper Pulse Units and Gunsmith L3',
      currentState: baseState,
    });

    expect(syncRes.ok).toBe(true);
    expect(syncRes.updatedState.username).toBe('GhostRaider_PS5');
    expect(syncRes.updatedState.platform).toBe('ps5');
    expect(syncRes.updatedState.syncSource).toBe('console-vision-sync');
    expect(syncRes.updatedState.hideoutLevels.gunsmith).toBe(3);
    const leaperSlot = syncRes.updatedState.stash.find(
      (s) => s.itemId === 'leaper_pulse_unit',
    );
    expect(leaperSlot?.quantity).toBe(4);
  });
});
