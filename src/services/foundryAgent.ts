import { buildTab1PrepPlan } from '../engine/prepIntelligence';
import { buildTab2RaidPlan } from '../engine/raidPlanner';
import { buildTab3InventorySmashPlan } from '../engine/inventorySmash';
import { getStaticGameCatalogSummary } from './gameCatalogClient';
import type {
  FoundryAutonomousPlan,
  LiveMapCondition,
  PlayerProgressState,
} from '../shared/types';

export const DEFAULT_FOUNDRY_ENDPOINT =
  'https://gaia-foundry-202045.openai.azure.com/openai/v1/responses';
export const DEFAULT_FOUNDRY_MODEL = 'gpt-6-astra';
export const FALLBACK_FOUNDRY_MODEL = 'model-router';

const FOUNDRY_PROXY_AUTONOMOUS_URL = '/api/foundry/autonomous-plan';
const FOUNDRY_TIMEOUT_MS = 12_000;
const MAX_AUTONOMOUS_TURNS = 3;

export interface FoundryFunctionToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export const FOUNDRY_GAME_CONTEXT_TOOLS: FoundryFunctionToolDefinition[] = [
  {
    type: 'function',
    name: 'get_five_raid_prep_status',
    description:
      'Returns the deterministic Tab 1 5-raid readiness counts, Rule 1a protected rare/upgrade items, Rule 1b recycle/refine/craft queue, and Rule 1c immediate sell items.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_live_map_raid_options',
    description:
      'Returns the deterministic Tab 2 live map weather/event telemetry and top 3 doable raid plans matched to the player loadout.',
    parameters: {
      type: 'object',
      properties: {
        mapSlug: {
          type: 'string',
          description: 'Optional map slug filter (e.g. dam-battleground, the-spaceport).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_missing_upgrade_items',
    description:
      'Returns the deterministic Tab 3 missing required items for future hideout upgrades, quests, and expedition projects along with their best drop locations.',
    parameters: {
      type: 'object',
      properties: {
        itemId: {
          type: 'string',
          description: 'Optional specific item ID to inspect.',
        },
      },
      additionalProperties: false,
    },
  },
];

interface ParsedFoundryInsight {
  tab1Summary?: string;
  tab2Commentary?: string;
  tab3FarmingTip?: string;
  liveEventOverrides?: Array<{
    mapSlug?: string;
    activeCondition?: string;
    hazardLevel?: LiveMapCondition['hazardLevel'];
  }>;
  webSearchCitations?: string[];
}

/**
 * Executes a game-context function tool call deterministically against the pre-computed
 * engine baseline (`prepIntelligence`, `raidPlanner`, `inventorySmash`).
 */
export function executeFoundryFunctionCall(
  toolName: string,
  rawArguments: unknown,
  player: PlayerProgressState,
  baseline: FoundryAutonomousPlan
): string {
  let parsedArgs: Record<string, unknown> = {};
  if (typeof rawArguments === 'string' && rawArguments.trim()) {
    try {
      parsedArgs = JSON.parse(rawArguments) as Record<string, unknown>;
    } catch {
      parsedArgs = {};
    }
  } else if (rawArguments && typeof rawArguments === 'object') {
    parsedArgs = rawArguments as Record<string, unknown>;
  }

  switch (toolName) {
    case 'get_five_raid_prep_status':
      return JSON.stringify({
        username: player.username,
        readiness: baseline.tab1Prep.readiness,
        protectedRareAndUpgradeItems: baseline.tab1Prep.protectedRareAndUpgradeItems,
        recycleRefineCraftQueue: baseline.tab1Prep.recycleRefineCraftQueue,
        sellImmediatelyList: baseline.tab1Prep.sellImmediatelyList,
        totalProjectedCoinsFromSales: baseline.tab1Prep.totalProjectedCoinsFromSales,
        totalStashSlotsFreed: baseline.tab1Prep.totalStashSlotsFreed,
      });

    case 'get_live_map_raid_options': {
      const mapSlugFilter =
        typeof parsedArgs.mapSlug === 'string' ? parsedArgs.mapSlug.trim() : '';
      const conditions = mapSlugFilter
        ? baseline.tab2Raids.liveMapConditions.filter(
            (c) => c.mapSlug === mapSlugFilter
          )
        : baseline.tab2Raids.liveMapConditions;
      const raids = mapSlugFilter
        ? baseline.tab2Raids.topRaidIdeas.filter((r) => r.mapSlug === mapSlugFilter)
        : baseline.tab2Raids.topRaidIdeas;
      return JSON.stringify({
        liveMapConditions: conditions,
        topRaidIdeas: raids,
      });
    }

    case 'get_missing_upgrade_items': {
      const itemIdFilter =
        typeof parsedArgs.itemId === 'string' ? parsedArgs.itemId.trim() : '';
      const missing = itemIdFilter
        ? baseline.tab3InventorySmash.missingRequiredItems.filter(
            (m) => m.itemId === itemIdFilter
          )
        : baseline.tab3InventorySmash.missingRequiredItems;
      return JSON.stringify({
        missingRequiredItems: missing,
      });
    }

    default:
      return JSON.stringify({
        error: `Unknown tool: ${toolName}`,
        availableTools: FOUNDRY_GAME_CONTEXT_TOOLS.map((t) => t.name),
      });
  }
}

/**
 * Builds the deterministic baseline plan for Tabs 1, 2, and 3 using local engine rules.
 */
export function buildDeterministicBaselinePlan(
  player: PlayerProgressState,
  mapConditions?: LiveMapCondition[]
): FoundryAutonomousPlan {
  const tab1Prep = buildTab1PrepPlan(player);
  const tab3InventorySmash = buildTab3InventorySmashPlan(player);
  const tab2Raids = buildTab2RaidPlan(
    player,
    mapConditions,
    tab3InventorySmash.missingRequiredItems
  );

  return {
    generatedAt: new Date().toISOString(),
    modelUsed: `${DEFAULT_FOUNDRY_MODEL} (deterministic-baseline)`,
    foundryEndpoint: DEFAULT_FOUNDRY_ENDPOINT,
    usedLiveWebSearch: false,
    webSearchCitations: [],
    tab1Prep,
    tab2Raids,
    tab3InventorySmash,
  };
}

/**
 * Builds the Azure AI Foundry Responses API request payload targeting
 * `https://gaia-foundry-202045.openai.azure.com/openai/v1/responses` (`rg-gaia`).
 */
export function buildFoundryAgentRequestPayload(
  player: PlayerProgressState,
  baseline: FoundryAutonomousPlan,
  model: string = DEFAULT_FOUNDRY_MODEL,
  options?: { includeFunctionTools?: boolean }
): Record<string, unknown> {
  const catalogSummary = getStaticGameCatalogSummary();
  const includeFunctionTools = options?.includeFunctionTools ?? true;

  const systemPrompt = [
    'You are the autonomous Azure AI Foundry Tactical Brain for ARC Raiders (arc-mobile).',
    'You operate on top of a strict deterministic inventory & raid engine.',
    'NEVER alter or contradict the deterministic Rule 1a protected item quantities, Rule 1b recycle/refine/craft slot savings, Rule 1c immediate sell coin totals, or Tab 3 missing item deficits.',
    'Use the hosted web_search tool to verify current ARC Raiders live map conditions, events (Electromagnetic Storm, Night Raid, High-Value Cache, Harvester), and meta farming routes, and call the game-context function tools if you need detailed prep, raid, or missing-item breakdowns.',
    'Return ONLY a valid JSON object matching this exact schema:',
    '{',
    '  "tab1Summary": "Concise tactical executive summary for Tab 1 (5-Raid Loadout Prep, protecting Rule 1a rare upgrade items, freeing stash slots via Rule 1b, and claiming Raider Coins via Rule 1c).",',
    '  "tab2Commentary": "Concise tactical route commentary for Tab 2 (Top 3 Raid Ideas matched to current loadout feasibility and active map conditions).",',
    '  "tab3FarmingTip": "High-yield farming route advice for Tab 3 (targeting red missing required items and best POI/container/ARC drops).",',
    '  "liveEventOverrides": [{ "mapSlug": "dam-battleground", "activeCondition": "Electromagnetic Storm", "hazardLevel": "High" }]',
    '}',
  ].join('\n');

  const userContext = JSON.stringify({
    playerProfile: {
      username: player.username,
      level: player.level,
      raiderCoins: player.raiderCoins,
      stashCapacity: player.stashCapacity,
      stashSlotsUsed: player.stash.length,
      loadout: player.loadout,
      hideoutLevels: player.hideoutLevels,
      completedQuestIds: player.completedQuestIds,
      activeQuestIds: player.activeQuestIds,
      completedProjectStages: player.completedProjectStages,
      learnedBlueprintIds: player.learnedBlueprintIds,
    },
    deterministicBaseline: {
      tab1Readiness: baseline.tab1Prep.readiness,
      protectedItemsCount: baseline.tab1Prep.protectedRareAndUpgradeItems.length,
      protectedItems: baseline.tab1Prep.protectedRareAndUpgradeItems.map((p) => ({
        itemId: p.itemId,
        itemName: p.itemName,
        protectedQuantity: p.protectedQuantity,
      })),
      totalProjectedCoinsFromSales: baseline.tab1Prep.totalProjectedCoinsFromSales,
      totalStashSlotsFreed: baseline.tab1Prep.totalStashSlotsFreed,
      topRaidIdeas: baseline.tab2Raids.topRaidIdeas.map((r) => ({
        rank: r.rank,
        mapSlug: r.mapSlug,
        mapName: r.mapName,
        activeCondition: r.activeCondition,
        targetedMissingItems: r.targetedMissingItems,
      })),
      missingRequiredItems: baseline.tab3InventorySmash.missingRequiredItems.map(
        (m) => ({
          itemId: m.itemId,
          itemName: m.itemName,
          missingQuantity: m.missingQuantity,
        })
      ),
    },
    staticCatalogDigest: catalogSummary,
  });

  const tools: Array<Record<string, unknown>> = [{ type: 'web_search' }];
  if (includeFunctionTools) {
    for (const fnTool of FOUNDRY_GAME_CONTEXT_TOOLS) {
      tools.push({ ...fnTool });
    }
  }

  return {
    model,
    store: false,
    tools,
    include: ['web_search_call.action.sources'],
    input: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userContext,
      },
    ],
  };
}

function extractJsonObject(rawText: string): ParsedFoundryInsight | null {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return null;
  }

  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const direct = JSON.parse(fenceStripped) as unknown;
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as ParsedFoundryInsight;
    }
  } catch {
    // Try substring extraction between first '{' and last '}'
  }

  const firstBrace = fenceStripped.indexOf('{');
  const lastBrace = fenceStripped.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = fenceStripped.slice(firstBrace, lastBrace + 1);
    try {
      const extracted = JSON.parse(candidate) as unknown;
      if (extracted && typeof extracted === 'object' && !Array.isArray(extracted)) {
        return extracted as ParsedFoundryInsight;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Merges the Azure AI Foundry Responses API output (and any `web_search` URL citations)
 * into the deterministic baseline plan while strictly preserving all Rule 1a/1b/1c
 * numbers and Tab 3 missing item quantities.
 */
export function mergeFoundryInsightIntoPlan(
  baseline: FoundryAutonomousPlan,
  rawFoundryResponse: unknown
): FoundryAutonomousPlan {
  const clonedBaseline: FoundryAutonomousPlan = {
    ...baseline,
    webSearchCitations: [...baseline.webSearchCitations],
    tab1Prep: {
      ...baseline.tab1Prep,
      readiness: { ...baseline.tab1Prep.readiness },
      protectedRareAndUpgradeItems: baseline.tab1Prep.protectedRareAndUpgradeItems.map(
        (item) => ({
          ...item,
          reasons: item.reasons.map((r) => ({ ...r })),
        })
      ),
      recycleRefineCraftQueue: baseline.tab1Prep.recycleRefineCraftQueue.map(
        (action) => ({
          ...action,
          outputs: action.outputs.map((o) => ({ ...o })),
        })
      ),
      sellImmediatelyList: baseline.tab1Prep.sellImmediatelyList.map((entry) => ({
        ...entry,
      })),
    },
    tab2Raids: {
      ...baseline.tab2Raids,
      liveMapConditions: baseline.tab2Raids.liveMapConditions.map((cond) => ({
        ...cond,
        activeEvents: [...cond.activeEvents],
        bonusLootTags: [...cond.bonusLootTags],
      })),
      topRaidIdeas: baseline.tab2Raids.topRaidIdeas.map((idea) => ({
        ...idea,
        expectedRewards: [...idea.expectedRewards],
        targetedMissingItems: [...idea.targetedMissingItems],
        steps: idea.steps.map((s) => ({ ...s })),
      })),
    },
    tab3InventorySmash: {
      ...baseline.tab3InventorySmash,
      annotatedInventory: baseline.tab3InventorySmash.annotatedInventory.map(
        (item) => ({
          ...item,
          requirements: item.requirements.map((req) => ({ ...req })),
        })
      ),
      missingRequiredItems: baseline.tab3InventorySmash.missingRequiredItems.map(
        (missing) => ({
          ...missing,
          requiredFor: missing.requiredFor.map((r) => ({ ...r })),
          bestPlacesToFind: missing.bestPlacesToFind.map((loc) => ({
            ...loc,
            poiNames: [...loc.poiNames],
            containerTypes: [...loc.containerTypes],
            arcSources: [...loc.arcSources],
          })),
        })
      ),
    },
  };

  if (!rawFoundryResponse || typeof rawFoundryResponse !== 'object') {
    return clonedBaseline;
  }

  const rawObj = rawFoundryResponse as Record<string, unknown>;
  const citationSet = new Set<string>(clonedBaseline.webSearchCitations);
  let sawWebSearchCall = false;
  const textFragments: string[] = [];

  if (typeof rawObj.output_text === 'string' && rawObj.output_text.trim()) {
    textFragments.push(rawObj.output_text.trim());
  }

  if (Array.isArray(rawObj.output)) {
    for (const item of rawObj.output) {
      if (!item || typeof item !== 'object') continue;
      const itemRecord = item as Record<string, unknown>;

      if (itemRecord.type === 'web_search_call') {
        sawWebSearchCall = true;
        const action = itemRecord.action as Record<string, unknown> | undefined;
        if (action && Array.isArray(action.sources)) {
          for (const src of action.sources) {
            if (typeof src === 'string' && src.trim()) {
              citationSet.add(src.trim());
            } else if (src && typeof src === 'object') {
              const url = (src as Record<string, unknown>).url;
              if (typeof url === 'string' && url.trim()) {
                citationSet.add(url.trim());
              }
            }
          }
        }
      }

      if (Array.isArray(itemRecord.sources)) {
        sawWebSearchCall = true;
        for (const src of itemRecord.sources) {
          if (typeof src === 'string' && src.trim()) {
            citationSet.add(src.trim());
          } else if (src && typeof src === 'object') {
            const url = (src as Record<string, unknown>).url;
            if (typeof url === 'string' && url.trim()) {
              citationSet.add(url.trim());
            }
          }
        }
      }

      if (Array.isArray(itemRecord.content)) {
        for (const part of itemRecord.content) {
          if (!part || typeof part !== 'object') continue;
          const partRecord = part as Record<string, unknown>;

          if (typeof partRecord.text === 'string' && partRecord.text.trim()) {
            textFragments.push(partRecord.text.trim());
          }

          if (Array.isArray(partRecord.annotations)) {
            for (const ann of partRecord.annotations) {
              if (!ann || typeof ann !== 'object') continue;
              const annRecord = ann as Record<string, unknown>;
              if (
                annRecord.type === 'url_citation' ||
                typeof annRecord.url === 'string'
              ) {
                const url = annRecord.url;
                if (typeof url === 'string' && url.trim()) {
                  citationSet.add(url.trim());
                }
              }
            }
          }
        }
      }
    }
  }

  let parsedInsight: ParsedFoundryInsight | null = null;
  if (textFragments.length > 0) {
    parsedInsight = extractJsonObject(textFragments.join('\n'));
  } else if (
    typeof rawObj.tab1Summary === 'string' ||
    typeof rawObj.tab2Commentary === 'string' ||
    typeof rawObj.tab3FarmingTip === 'string'
  ) {
    parsedInsight = rawObj as unknown as ParsedFoundryInsight;
  }

  if (parsedInsight?.webSearchCitations && Array.isArray(parsedInsight.webSearchCitations)) {
    for (const url of parsedInsight.webSearchCitations) {
      if (typeof url === 'string' && url.trim()) {
        citationSet.add(url.trim());
      }
    }
  }

  if (
    parsedInsight?.tab1Summary &&
    typeof parsedInsight.tab1Summary === 'string' &&
    parsedInsight.tab1Summary.trim().length > 0
  ) {
    clonedBaseline.tab1Prep.agentTacticalSummary = parsedInsight.tab1Summary.trim();
  }

  if (
    parsedInsight?.tab2Commentary &&
    typeof parsedInsight.tab2Commentary === 'string' &&
    parsedInsight.tab2Commentary.trim().length > 0
  ) {
    clonedBaseline.tab2Raids.agentRouteCommentary =
      parsedInsight.tab2Commentary.trim();
  }

  if (
    parsedInsight?.tab3FarmingTip &&
    typeof parsedInsight.tab3FarmingTip === 'string' &&
    parsedInsight.tab3FarmingTip.trim().length > 0
  ) {
    clonedBaseline.tab3InventorySmash.agentFarmingTip =
      parsedInsight.tab3FarmingTip.trim();
  }

  if (
    parsedInsight?.liveEventOverrides &&
    Array.isArray(parsedInsight.liveEventOverrides)
  ) {
    for (const override of parsedInsight.liveEventOverrides) {
      if (
        override &&
        typeof override.mapSlug === 'string' &&
        typeof override.activeCondition === 'string' &&
        override.activeCondition.trim()
      ) {
        const condMatch = clonedBaseline.tab2Raids.liveMapConditions.find(
          (c) => c.mapSlug === override.mapSlug
        );
        if (condMatch) {
          condMatch.activeCondition = override.activeCondition.trim();
          if (
            override.hazardLevel === 'Low' ||
            override.hazardLevel === 'Moderate' ||
            override.hazardLevel === 'High' ||
            override.hazardLevel === 'Extreme'
          ) {
            condMatch.hazardLevel = override.hazardLevel;
          }
        }
        const ideaMatch = clonedBaseline.tab2Raids.topRaidIdeas.find(
          (idea) => idea.mapSlug === override.mapSlug
        );
        if (ideaMatch) {
          ideaMatch.activeCondition = override.activeCondition.trim();
        }
      }
    }
  }

  if (typeof rawObj.model === 'string' && rawObj.model.trim()) {
    clonedBaseline.modelUsed = rawObj.model.trim();
  } else if (parsedInsight) {
    clonedBaseline.modelUsed = DEFAULT_FOUNDRY_MODEL;
  }

  const finalCitations = Array.from(citationSet);
  clonedBaseline.webSearchCitations = finalCitations;
  clonedBaseline.usedLiveWebSearch =
    sawWebSearchCall || finalCitations.length > 0;

  return clonedBaseline;
}

interface FoundryFunctionCallItem {
  type: 'function_call';
  id?: string;
  call_id?: string;
  name: string;
  arguments?: unknown;
}

function extractFunctionCalls(
  rawFoundryResponse: unknown
): FoundryFunctionCallItem[] {
  if (!rawFoundryResponse || typeof rawFoundryResponse !== 'object') {
    return [];
  }
  const rawObj = rawFoundryResponse as Record<string, unknown>;
  if (!Array.isArray(rawObj.output)) {
    return [];
  }
  const calls: FoundryFunctionCallItem[] = [];
  for (const item of rawObj.output) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    if (rec.type === 'function_call' && typeof rec.name === 'string') {
      calls.push({
        type: 'function_call',
        id: typeof rec.id === 'string' ? rec.id : undefined,
        call_id:
          typeof rec.call_id === 'string'
            ? rec.call_id
            : typeof rec.id === 'string'
              ? rec.id
              : `call_${calls.length + 1}`,
        name: rec.name,
        arguments: rec.arguments,
      });
    }
  }
  return calls;
}

/**
 * Runs the full autonomous Foundry Agent loop:
 * 1. Computes deterministic baseline (`tab1Prep`, `tab3InventorySmash`, `tab2Raids`).
 * 2. Calls `POST /api/foundry/autonomous-plan` to invoke `gpt-6-astra` on `gaia-foundry-202045` (`store: false`).
 * 3. If the model invokes any game-context function tools (`function_call`), executes them deterministically
 *    against the local engine and continues the autonomous Responses API loop.
 * 4. Merges live Foundry tactical insights & web_search citations while preserving all Rule 1a/1b/1c
 *    and Tab 3 numerical invariants, or returns the deterministic baseline cleanly when offline.
 */
export async function runAutonomousFoundryAgent(
  player: PlayerProgressState,
  mapConditions?: LiveMapCondition[]
): Promise<FoundryAutonomousPlan> {
  const baseline = buildDeterministicBaselinePlan(player, mapConditions);
  const initialPayload = buildFoundryAgentRequestPayload(
    player,
    baseline,
    DEFAULT_FOUNDRY_MODEL
  );

  let currentPlan = baseline;
  const conversationInput = Array.isArray(initialPayload.input)
    ? [...(initialPayload.input as Array<Record<string, unknown>>)]
    : [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FOUNDRY_TIMEOUT_MS);

  try {
    for (let turn = 0; turn < MAX_AUTONOMOUS_TURNS; turn++) {
      const turnPayload: Record<string, unknown> = {
        ...initialPayload,
        store: false,
        input: [...conversationInput],
      };

      const response = await fetch(FOUNDRY_PROXY_AUTONOMOUS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(turnPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        return currentPlan;
      }

      const rawFoundryJson = (await response.json()) as unknown;
      currentPlan = mergeFoundryInsightIntoPlan(currentPlan, rawFoundryJson);

      const functionCalls = extractFunctionCalls(rawFoundryJson);
      if (functionCalls.length === 0 || turn + 1 >= MAX_AUTONOMOUS_TURNS) {
        return currentPlan;
      }

      for (const fnCall of functionCalls) {
        const callId = fnCall.call_id || fnCall.id || `call_${turn}_${fnCall.name}`;
        const argsString =
          typeof fnCall.arguments === 'string'
            ? fnCall.arguments
            : JSON.stringify(fnCall.arguments ?? {});

        conversationInput.push({
          type: 'function_call',
          call_id: callId,
          name: fnCall.name,
          arguments: argsString,
        });

        const toolOutput = executeFoundryFunctionCall(
          fnCall.name,
          fnCall.arguments,
          player,
          baseline
        );

        conversationInput.push({
          type: 'function_call_output',
          call_id: callId,
          output: toolOutput,
        });
      }
    }

    return currentPlan;
  } catch {
    return currentPlan;
  } finally {
    clearTimeout(timeoutId);
  }
}
