import {
  CATALOG_ITEMS,
  CRAFTING_RECIPES,
  HIDEOUT_REQUIREMENTS,
  QUEST_REQUIREMENTS,
  PROJECT_STAGES,
} from '../data/gameCatalog';
import type { CatalogItem } from '../shared/types';

/**
 * Lookup helper for a single catalog item by ID.
 */
export function getCatalogItemById(itemId: string): CatalogItem | undefined {
  return CATALOG_ITEMS.find((item) => item.id === itemId);
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
