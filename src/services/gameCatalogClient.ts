import {
  CATALOG_ITEMS,
  CRAFTING_RECIPES,
  HIDEOUT_REQUIREMENTS,
  QUEST_REQUIREMENTS,
  PROJECT_STAGES,
} from '../data/gameCatalog';
import type {
  CatalogItem,
  CraftingRecipe,
  HideoutLevelRequirement,
  ProjectStageSpec,
  QuestRequirementSpec,
} from '../shared/types';

/**
 * Lookup helper for a single catalog item by ID.
 */
export function getCatalogItemById(itemId: string): CatalogItem | undefined {
  return CATALOG_ITEMS.find((item) => item.id === itemId);
}

/**
 * Returns all static catalog items.
 */
export function getAllCatalogItems(): CatalogItem[] {
  return CATALOG_ITEMS;
}

/**
 * Searches catalog items by name, ID, category, or rarity (case-insensitive).
 */
export function searchCatalogItems(query: string): CatalogItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return CATALOG_ITEMS;
  }
  return CATALOG_ITEMS.filter(
    (item) =>
      item.id.toLowerCase().includes(normalized) ||
      item.name.toLowerCase().includes(normalized) ||
      item.category.toLowerCase().includes(normalized) ||
      item.rarity.toLowerCase().includes(normalized),
  );
}

/**
 * Returns crafting/refining recipes that produce the specified output item ID.
 */
export function getRecipesForOutputItem(outputItemId: string): CraftingRecipe[] {
  return CRAFTING_RECIPES.filter((recipe) => recipe.outputItemId === outputItemId);
}

/**
 * Returns static hideout station upgrade requirements.
 */
export function getHideoutRequirements(): HideoutLevelRequirement[] {
  return HIDEOUT_REQUIREMENTS;
}

/**
 * Returns static trader quest requirements.
 */
export function getQuestRequirements(): QuestRequirementSpec[] {
  return QUEST_REQUIREMENTS;
}

/**
 * Returns static expedition project stage requirements.
 */
export function getProjectStages(): ProjectStageSpec[] {
  return PROJECT_STAGES;
}

/**
 * Enriches the static catalog with optional remote item metadata while preserving
 * deterministic static catalog guarantees (item IDs, recycle yields, and drop locations).
 */
export function mergeRemoteCatalogEnrichment(
  remoteItems?: Array<Partial<CatalogItem> & { id: string }> | null,
): CatalogItem[] {
  if (!Array.isArray(remoteItems) || remoteItems.length === 0) {
    return CATALOG_ITEMS;
  }

  const remoteById = new Map<string, Partial<CatalogItem> & { id: string }>();
  for (const entry of remoteItems) {
    if (entry && typeof entry.id === 'string') {
      remoteById.set(entry.id, entry);
    }
  }

  return CATALOG_ITEMS.map((staticItem) => {
    const remote = remoteById.get(staticItem.id);
    if (!remote) {
      return staticItem;
    }
    return {
      ...staticItem,
      description:
        typeof remote.description === 'string' && remote.description.trim().length > 0
          ? remote.description
          : staticItem.description,
      iconUrl:
        typeof remote.iconUrl === 'string' && remote.iconUrl.trim().length > 0
          ? remote.iconUrl
          : staticItem.iconUrl,
      sellValueCoins:
        typeof remote.sellValueCoins === 'number' && remote.sellValueCoins > 0
          ? remote.sellValueCoins
          : staticItem.sellValueCoins,
      recycleYields:
        Array.isArray(remote.recycleYields) && remote.recycleYields.length > 0
          ? remote.recycleYields
          : staticItem.recycleYields,
      dropLocations:
        Array.isArray(remote.dropLocations) && remote.dropLocations.length > 0
          ? remote.dropLocations
          : staticItem.dropLocations,
    };
  });
}

/**
 * Returns a structured Markdown + JSON digest of all items, crafting/refining recipes,
 * quests, hideout station upgrades, project stages, and drop zones for the
 * Azure AI Foundry Agent context window.
 */
export function getStaticGameCatalogSummary(): string {
  const itemById = new Map<string, CatalogItem>(
    CATALOG_ITEMS.map((item) => [item.id, item]),
  );

  const formatItemQty = (itemId: string, quantity: number): string => {
    const item = itemById.get(itemId);
    return `${item ? item.name : itemId} (${itemId}) x${quantity}`;
  };

  const itemsLines = CATALOG_ITEMS.map((item) => {
    const yields =
      item.recycleYields.length > 0
        ? item.recycleYields
            .map((y) => formatItemQty(y.itemId, y.quantity))
            .join(', ')
        : 'None';
    const drops =
      item.dropLocations.length > 0
        ? item.dropLocations
            .map(
              (loc) =>
                `${loc.mapName} [${loc.poiNames.join(', ')}] (Containers: ${loc.containerTypes.join(', ')}; ARC: ${loc.arcSources.join(', ') || 'None'}; Rate: ${loc.dropRateHint})`,
            )
            .join(' | ')
        : 'Crafted / Refined';

    return `- **${item.name}** (\`${item.id}\`) | Rarity: ${item.rarity} | Category: ${item.category} | MaxStack: ${item.maxStack} | Sell: ${item.sellValueCoins} coins | Recycle Yields: [${yields}] | Drop Zones: ${drops}`;
  });

  const recipeLines = CRAFTING_RECIPES.map((recipe) => {
    const outName = itemById.get(recipe.outputItemId)?.name ?? recipe.outputItemId;
    const ingredients = recipe.ingredients
      .map((ing) => formatItemQty(ing.itemId, ing.quantity))
      .join(', ');
    const blueprintNote = recipe.blueprintId ? ` | Blueprint: ${recipe.blueprintId}` : '';
    return `- [${recipe.actionType.toUpperCase()}] **${outName}** (\`${recipe.outputItemId}\`) x${recipe.outputQuantity} @ ${recipe.stationName} Lv.${recipe.requiredStationLevel}${blueprintNote} <= Ingredients: ${ingredients}`;
  });

  const hideoutLines = HIDEOUT_REQUIREMENTS.map((req) => {
    const items = req.requiredItems
      .map((r) => formatItemQty(r.itemId, r.quantity))
      .join(', ');
    return `- **${req.stationName}** (\`${req.stationId}\`) Level ${req.level}: ${items}`;
  });

  const questLines = QUEST_REQUIREMENTS.map((quest) => {
    const items = quest.requiredItems
      .map((r) => formatItemQty(r.itemId, r.quantity))
      .join(', ');
    return `- **${quest.questName}** (\`${quest.questId}\`, Trader: ${quest.traderName}, Map: ${quest.mapName}): Requires [${items}] -> Reward: ${quest.rewardSummary}`;
  });

  const projectLines = PROJECT_STAGES.map((stage) => {
    const items = stage.requiredItems
      .map((r) => formatItemQty(r.itemId, r.quantity))
      .join(', ');
    return `- **${stage.projectName}** (\`${stage.projectId}\`) Stage ${stage.stageNumber}: Requires [${items}] -> Reward: ${stage.rewardSummary}`;
  });

  const structuredDigest = {
    catalogCounts: {
      items: CATALOG_ITEMS.length,
      recipes: CRAFTING_RECIPES.length,
      hideoutUpgrades: HIDEOUT_REQUIREMENTS.length,
      quests: QUEST_REQUIREMENTS.length,
      projectStages: PROJECT_STAGES.length,
    },
    items: CATALOG_ITEMS.map((item) => ({
      id: item.id,
      name: item.name,
      rarity: item.rarity,
      category: item.category,
      maxStack: item.maxStack,
      sellValueCoins: item.sellValueCoins,
      recycleYields: item.recycleYields,
      dropLocations: item.dropLocations,
    })),
    recipes: CRAFTING_RECIPES,
    hideoutRequirements: HIDEOUT_REQUIREMENTS,
    questRequirements: QUEST_REQUIREMENTS,
    projectStages: PROJECT_STAGES,
  };

  return [
    '# ARC RAIDERS STATIC GAME CATALOG DIGEST',
    '',
    '## 1. ITEMS, RECYCLE YIELDS & DROP ZONES',
    ...itemsLines,
    '',
    '## 2. CRAFTING & REFINING RECIPES',
    ...recipeLines,
    '',
    '## 3. HIDEOUT STATION UPGRADE REQUIREMENTS',
    ...hideoutLines,
    '',
    '## 4. TRADER QUEST REQUIREMENTS',
    ...questLines,
    '',
    '## 5. EXPEDITION PROJECT STAGES',
    ...projectLines,
    '',
    '## 6. MACHINE-READABLE JSON SNAPSHOT',
    JSON.stringify(structuredDigest),
  ].join('\n');
}
