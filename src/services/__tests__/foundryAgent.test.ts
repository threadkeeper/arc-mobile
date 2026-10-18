import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PLAYER_STATE } from '../../data/gameCatalog';
import {
  DEFAULT_FOUNDRY_ENDPOINT,
  DEFAULT_FOUNDRY_MODEL,
  FALLBACK_FOUNDRY_MODEL,
  FOUNDRY_GAME_CONTEXT_TOOLS,
  buildDeterministicBaselinePlan,
  buildFoundryAgentRequestPayload,
  executeFoundryFunctionCall,
  mergeFoundryInsightIntoPlan,
  runAutonomousFoundryAgent,
} from '../foundryAgent';

describe('foundryAgent service (gaia-foundry-202045 / gpt-6-astra)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildFoundryAgentRequestPayload builds a valid Responses API request with web_search, function tools, and catalog summary', () => {
    const baseline = buildDeterministicBaselinePlan(DEMO_PLAYER_STATE);
    const payload = buildFoundryAgentRequestPayload(DEMO_PLAYER_STATE, baseline);

    expect(DEFAULT_FOUNDRY_ENDPOINT).toBe(
      'https://gaia-foundry-202045.openai.azure.com/openai/v1/responses'
    );
    expect(DEFAULT_FOUNDRY_MODEL).toBe('gpt-6-astra');
    expect(FALLBACK_FOUNDRY_MODEL).toBe('model-router');

    expect(payload.model).toBe('gpt-6-astra');
    expect(payload.store).toBe(false);
    expect(payload.tools).toEqual([
      { type: 'web_search' },
      ...FOUNDRY_GAME_CONTEXT_TOOLS,
    ]);
    expect(payload.include).toEqual(['web_search_call.action.sources']);

    const input = payload.input as Array<{ role: string; content: string }>;
    expect(Array.isArray(input)).toBe(true);
    expect(input.length).toBeGreaterThanOrEqual(2);
    expect(input[0].role).toBe('system');
    expect(input[0].content).toContain('tab1Summary');
    expect(input[0].content).toContain('tab2Commentary');
    expect(input[0].content).toContain('tab3FarmingTip');
    expect(input[0].content).toContain('liveEventOverrides');

    expect(input[1].role).toBe('user');
    expect(input[1].content).toContain(DEMO_PLAYER_STATE.username);
    expect(input[1].content).toContain('ARC RAIDERS STATIC GAME CATALOG DIGEST');
  });

  it('executeFoundryFunctionCall returns exact deterministic data for prep, raid options, and missing items', () => {
    const baseline = buildDeterministicBaselinePlan(DEMO_PLAYER_STATE);

    const prepJson = JSON.parse(
      executeFoundryFunctionCall(
        'get_five_raid_prep_status',
        '{}',
        DEMO_PLAYER_STATE,
        baseline
      )
    );
    expect(prepJson.readiness).toEqual(baseline.tab1Prep.readiness);
    expect(prepJson.totalProjectedCoinsFromSales).toBe(
      baseline.tab1Prep.totalProjectedCoinsFromSales
    );

    const raidJson = JSON.parse(
      executeFoundryFunctionCall(
        'get_live_map_raid_options',
        JSON.stringify({ mapSlug: 'dam-battleground' }),
        DEMO_PLAYER_STATE,
        baseline
      )
    );
    expect(
      raidJson.liveMapConditions.every(
        (c: { mapSlug: string }) => c.mapSlug === 'dam-battleground'
      )
    ).toBe(true);

    const missingJson = JSON.parse(
      executeFoundryFunctionCall(
        'get_missing_upgrade_items',
        '{}',
        DEMO_PLAYER_STATE,
        baseline
      )
    );
    expect(missingJson.missingRequiredItems).toEqual(
      baseline.tab3InventorySmash.missingRequiredItems
    );
  });

  it('mergeFoundryInsightIntoPlan extracts web_search citations and merges summaries while preserving Rule 1a/1b/1c and Tab 3 invariants', () => {
    const baseline = buildDeterministicBaselinePlan(DEMO_PLAYER_STATE);

    const mockFoundryResponse = {
      id: 'resp_live_gaia_001',
      model: 'gpt-6-astra',
      output: [
        {
          type: 'web_search_call',
          id: 'ws_001',
          status: 'completed',
          action: {
            type: 'search',
            query: 'ARC Raiders live map conditions Spaceport Dam Battleground',
            sources: [
              { url: 'https://metaforge.app/arc-raiders/event-timers' },
              { url: 'https://arctracker.io/maps' },
            ],
          },
        },
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                tab1Summary:
                  'Foundry Live Prep: Lock Leaper Pulse Units and Tellurion; recycle scrap and sell trinkets for immediate Raider Coins.',
                tab2Commentary:
                  'Foundry Live Raid: Deploy to Dam Battleground during Electromagnetic Storm for boosted Leaper Pulse Unit drops.',
                tab3FarmingTip:
                  'Foundry Live Smash: Target Research & Administration and Control Tower A6 for missing upgrade parts.',
                liveEventOverrides: [
                  {
                    mapSlug: 'dam-battleground',
                    activeCondition: 'Electromagnetic Storm (Verified Live)',
                    hazardLevel: 'Extreme',
                  },
                ],
              }),
              annotations: [
                {
                  type: 'url_citation',
                  url: 'https://arcraiders.wiki/wiki/Dam_Battleground',
                },
              ],
            },
          ],
        },
      ],
    };

    const merged = mergeFoundryInsightIntoPlan(baseline, mockFoundryResponse);

    // Summaries updated from Foundry output
    expect(merged.tab1Prep.agentTacticalSummary).toContain('Foundry Live Prep:');
    expect(merged.tab2Raids.agentRouteCommentary).toContain('Foundry Live Raid:');
    expect(merged.tab3InventorySmash.agentFarmingTip).toContain('Foundry Live Smash:');
    expect(merged.modelUsed).toBe('gpt-6-astra');
    expect(merged.usedLiveWebSearch).toBe(true);
    expect(merged.webSearchCitations).toEqual(
      expect.arrayContaining([
        'https://metaforge.app/arc-raiders/event-timers',
        'https://arctracker.io/maps',
        'https://arcraiders.wiki/wiki/Dam_Battleground',
      ])
    );

    // Live event override applied
    const damCondition = merged.tab2Raids.liveMapConditions.find(
      (c) => c.mapSlug === 'dam-battleground'
    );
    expect(damCondition?.activeCondition).toBe(
      'Electromagnetic Storm (Verified Live)'
    );

    // Deterministic Rule 1a, 1b, 1c numbers and Tab 3 missing item counts are strictly preserved
    expect(merged.tab1Prep.readiness).toEqual(baseline.tab1Prep.readiness);
    expect(merged.tab1Prep.protectedRareAndUpgradeItems).toEqual(
      baseline.tab1Prep.protectedRareAndUpgradeItems
    );
    expect(merged.tab1Prep.recycleRefineCraftQueue).toEqual(
      baseline.tab1Prep.recycleRefineCraftQueue
    );
    expect(merged.tab1Prep.sellImmediatelyList).toEqual(
      baseline.tab1Prep.sellImmediatelyList
    );
    expect(merged.tab1Prep.totalProjectedCoinsFromSales).toBe(
      baseline.tab1Prep.totalProjectedCoinsFromSales
    );
    expect(merged.tab1Prep.totalStashSlotsFreed).toBe(
      baseline.tab1Prep.totalStashSlotsFreed
    );
    expect(merged.tab3InventorySmash.missingRequiredItems).toEqual(
      baseline.tab3InventorySmash.missingRequiredItems
    );
  });

  it('runAutonomousFoundryAgent executes multi-turn function_call loop with web_search and preserves deterministic numbers', async () => {
    const baseline = buildDeterministicBaselinePlan(DEMO_PLAYER_STATE);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'resp_turn_1',
          model: 'gpt-6-astra',
          output: [
            {
              type: 'web_search_call',
              action: {
                sources: [{ url: 'https://metaforge.app/arc-raiders/live-events' }],
              },
            },
            {
              type: 'function_call',
              call_id: 'call_prep_01',
              name: 'get_five_raid_prep_status',
              arguments: '{}',
            },
            {
              type: 'function_call',
              call_id: 'call_missing_01',
              name: 'get_missing_upgrade_items',
              arguments: '{}',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'resp_turn_2',
          model: 'gpt-6-astra',
          output_text: JSON.stringify({
            tab1Summary: 'Autonomous Loop Tab 1 Summary after tool inspection',
            tab2Commentary: 'Autonomous Loop Tab 2 Commentary after tool inspection',
            tab3FarmingTip: 'Autonomous Loop Tab 3 Farming Tip after tool inspection',
          }),
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const plan = await runAutonomousFoundryAgent(DEMO_PLAYER_STATE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondCallBody.store).toBe(false);
    expect(
      secondCallBody.input.some(
        (item: { type?: string; call_id?: string }) =>
          item.type === 'function_call_output' && item.call_id === 'call_prep_01'
      )
    ).toBe(true);

    expect(plan.usedLiveWebSearch).toBe(true);
    expect(plan.webSearchCitations).toContain(
      'https://metaforge.app/arc-raiders/live-events'
    );
    expect(plan.tab1Prep.agentTacticalSummary).toBe(
      'Autonomous Loop Tab 1 Summary after tool inspection'
    );
    expect(plan.tab2Raids.agentRouteCommentary).toBe(
      'Autonomous Loop Tab 2 Commentary after tool inspection'
    );
    expect(plan.tab3InventorySmash.agentFarmingTip).toBe(
      'Autonomous Loop Tab 3 Farming Tip after tool inspection'
    );
    expect(plan.tab1Prep.totalProjectedCoinsFromSales).toBe(
      baseline.tab1Prep.totalProjectedCoinsFromSales
    );
    expect(plan.tab3InventorySmash.missingRequiredItems).toEqual(
      baseline.tab3InventorySmash.missingRequiredItems
    );
  });

  it('runAutonomousFoundryAgent falls back cleanly to deterministic plan when proxy is offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8787'))
    );

    const plan = await runAutonomousFoundryAgent(DEMO_PLAYER_STATE);

    expect(plan.foundryEndpoint).toBe(DEFAULT_FOUNDRY_ENDPOINT);
    expect(plan.usedLiveWebSearch).toBe(false);
    expect(plan.tab1Prep.protectedRareAndUpgradeItems.length).toBeGreaterThan(0);
    expect(plan.tab2Raids.topRaidIdeas).toHaveLength(3);
    expect(plan.tab3InventorySmash.missingRequiredItems.length).toBeGreaterThan(0);
  });

  it('runAutonomousFoundryAgent merges live Foundry insights when proxy responds with 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'resp_live_gaia_002',
          model: 'gpt-6-astra',
          output_text: JSON.stringify({
            tab1Summary: 'Live Foundry Tab 1 Tactical Summary',
            tab2Commentary: 'Live Foundry Tab 2 Route Commentary',
            tab3FarmingTip: 'Live Foundry Tab 3 Farming Tip',
          }),
          output: [
            {
              type: 'web_search_call',
              action: {
                sources: [{ url: 'https://arctracker.io/events' }],
              },
            },
          ],
        }),
      })
    );

    const plan = await runAutonomousFoundryAgent(DEMO_PLAYER_STATE);

    expect(plan.usedLiveWebSearch).toBe(true);
    expect(plan.webSearchCitations).toContain('https://arctracker.io/events');
    expect(plan.tab1Prep.agentTacticalSummary).toBe(
      'Live Foundry Tab 1 Tactical Summary'
    );
    expect(plan.tab2Raids.agentRouteCommentary).toBe(
      'Live Foundry Tab 2 Route Commentary'
    );
    expect(plan.tab3InventorySmash.agentFarmingTip).toBe(
      'Live Foundry Tab 3 Farming Tip'
    );
  });
});

