/**
 * Shared TypeScript domain contract for ARC Raiders Mobile Web Companion (`arc-mobile`).
 * Locked by `arc-coordinator` so all 4 parallel subagents build against identical types.
 */

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemCategory =
  | 'weapon'
  | 'shield'
  | 'augment'
  | 'ammo'
  | 'healing'
  | 'tactical'
  | 'material'
  | 'arc_part'
  | 'trinket'
  | 'key';

export type RequirementCategory =
  | 'quest'
  | 'hideout_upgrade'
  | 'project'
  | 'weapon_upgrade';

export type RequirementStatus = 'past' | 'future';

export interface DropLocationSpec {
  mapSlug: string;
  mapName: string;
  poiNames: string[];
  containerTypes: string[];
  arcSources: string[];
  dropRateHint: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  rarity: ItemRarity;
  category: ItemCategory;
  maxStack: number;
  sellValueCoins: number;
  iconUrl: string;
  description: string;
  recycleYields: Array<{ itemId: string; quantity: number }>;
  dropLocations: DropLocationSpec[];
}

export interface CraftingRecipe {
  id: string;
  outputItemId: string;
  outputQuantity: number;
  actionType: 'craft' | 'refine';
  stationId: string;
  stationName: string;
  requiredStationLevel: number;
  blueprintId?: string;
  ingredients: Array<{ itemId: string; quantity: number }>;
}

export interface HideoutLevelRequirement {
  stationId: string;
  stationName: string;
  level: number;
  requiredItems: Array<{ itemId: string; quantity: number }>;
}

export interface QuestRequirementSpec {
  questId: string;
  questName: string;
  traderName: string;
  mapName: string;
  requiredItems: Array<{ itemId: string; quantity: number }>;
  rewardSummary: string;
}

export interface ProjectStageSpec {
  projectId: string;
  projectName: string;
  stageNumber: number;
  requiredItems: Array<{ itemId: string; quantity: number }>;
  rewardSummary: string;
}

export interface StashSlotItem {
  slotIndex: number;
  itemId: string;
  quantity: number;
}

export interface EquippedLoadout {
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  shieldId: string | null;
  augmentId: string | null;
  quickUseItemIds: string[];
  ammoStacks: Array<{ itemId: string; quantity: number }>;
}

export interface PlayerProgressState {
  username: string;
  level: number;
  raiderCoins: number;
  stashCapacity: number;
  stash: StashSlotItem[];
  loadout: EquippedLoadout;
  hideoutLevels: Record<string, number>;
  completedQuestIds: string[];
  activeQuestIds: string[];
  completedProjectStages: Record<string, number>;
  learnedBlueprintIds: string[];
  syncedAt: string;
  syncSource:
    | 'arctracker-live'
    | 'psn-embark-bridge'
    | 'console-vision-sync'
    | 'demo-profile';
  platform?: 'ps5' | 'xbox' | 'pc';
  embarkId?: string;
  psnOnlineId?: string;
}

export interface AuthCredentials {
  userApiKey: string;
  appApiKey: string;
  savedAt: string;
  source:
    | 'manual'
    | 'browser-pull'
    | 'clipboard'
    | 'url-param'
    | 'oauth-pkce'
    | 'psn-npsso'
    | 'embark-session'
    | 'console-vision'
    | 'demo';
  embarkAccessToken?: string;
  psnNpsso?: string;
  embarkId?: string;
  psnOnlineId?: string;
}

export interface LiveMapCondition {
  mapSlug: string;
  mapName: string;
  activeCondition: string;
  hazardLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  activeEvents: string[];
  bonusLootTags: string[];
  expiresInMinutes: number;
}

// ============================================================================
// TAB 1: PREP (5-Raid Loadouts + Rules a, b, c)
// ============================================================================

export interface FiveRaidReadiness {
  targetRaids: number;
  primaryWeaponsReady: number;
  secondaryWeaponsReady: number;
  shieldsReady: number;
  augmentsReady: number;
  healingStacksReady: number;
  ammoStacksReady: number;
  overallReadyRaids: number;
}

export interface ProtectedItemEntry {
  itemId: string;
  itemName: string;
  rarity: ItemRarity;
  ownedQuantity: number;
  protectedQuantity: number;
  reasons: Array<{
    label: string;
    category: RequirementCategory;
    neededQuantity: number;
  }>;
}

export type PrepActionKind = 'RECYCLE' | 'REFINE' | 'CRAFT';

export interface PrepAction {
  id: string;
  stepOrder: number;
  kind: PrepActionKind;
  title: string;
  sourceItemId: string;
  sourceItemName: string;
  sourceQuantity: number;
  outputs: Array<{ itemId: string; itemName: string; quantity: number }>;
  slotsFreed: number;
  reason: string;
}

export interface ImmediateSellEntry {
  itemId: string;
  itemName: string;
  rarity: ItemRarity;
  quantityToSell: number;
  unitCoins: number;
  totalCoins: number;
  slotsFreed: number;
  reason: string;
}

export interface Tab1PrepPlan {
  readiness: FiveRaidReadiness;
  protectedRareAndUpgradeItems: ProtectedItemEntry[];
  recycleRefineCraftQueue: PrepAction[];
  sellImmediatelyList: ImmediateSellEntry[];
  totalProjectedCoinsFromSales: number;
  totalStashSlotsFreed: number;
  agentTacticalSummary: string;
}

// ============================================================================
// TAB 2: TOP 3 RAID IDEAS (Map + Active Events + Doable Step-by-Step)
// ============================================================================

export interface RaidStep {
  stepNumber: number;
  phase: 'Insertion' | 'Primary Objective' | 'High-Value Loot' | 'Extraction';
  instruction: string;
  targetPoi: string;
  cautionNote: string;
}

export interface RaidIdeaCard {
  rank: 1 | 2 | 3;
  mapSlug: string;
  mapName: string;
  raidTitle: string;
  activeCondition: string;
  doableWithCurrentLoadout: boolean;
  loadoutFitLabel: string;
  recommendedKitSummary: string;
  expectedRewards: string[];
  targetedMissingItems: string[];
  estimatedCoinYield: string;
  excitementScore: number;
  steps: RaidStep[];
}

export interface Tab2RaidPlan {
  liveMapConditions: LiveMapCondition[];
  topRaidIdeas: RaidIdeaCard[];
  agentRouteCommentary: string;
}

// ============================================================================
// TAB 3: INVENTORY SMASH (Grey Past, Colored Future, Red Missing + Farming)
// ============================================================================

export interface RequirementReference {
  id: string;
  label: string;
  category: RequirementCategory;
  status: RequirementStatus;
  requiredQuantity: number;
}

export interface AnnotatedInventoryItem {
  itemId: string;
  itemName: string;
  rarity: ItemRarity;
  category: ItemCategory;
  ownedQuantity: number;
  slotsUsed: number;
  requirements: RequirementReference[];
  safeActionSummary: string;
}

export interface MissingRequirementItem {
  itemId: string;
  itemName: string;
  rarity: ItemRarity;
  ownedQuantity: number;
  requiredQuantity: number;
  missingQuantity: number;
  requiredFor: Array<{
    id: string;
    label: string;
    category: RequirementCategory;
    quantityNeeded: number;
  }>;
  bestPlacesToFind: DropLocationSpec[];
}

export interface Tab3InventorySmashPlan {
  annotatedInventory: AnnotatedInventoryItem[];
  missingRequiredItems: MissingRequirementItem[];
  agentFarmingTip: string;
}

// ============================================================================
// UNIFIED FOUNDRY AUTONOMOUS RESPONSE
// ============================================================================

export interface FoundryAutonomousPlan {
  generatedAt: string;
  modelUsed: string;
  foundryEndpoint: string;
  usedLiveWebSearch: boolean;
  webSearchCitations: string[];
  tab1Prep: Tab1PrepPlan;
  tab2Raids: Tab2RaidPlan;
  tab3InventorySmash: Tab3InventorySmashPlan;
}
