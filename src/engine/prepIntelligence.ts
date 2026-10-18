import { CRAFTING_RECIPES, ITEMS_BY_ID } from '../data/gameCatalog';
import {
  FiveRaidReadiness,
  ImmediateSellEntry,
  PlayerProgressState,
  PrepAction,
  ProtectedItemEntry,
  Tab1PrepPlan,
} from '../shared/types';
import {
  collectAllRequirementsByItem,
  getOwnedStashQuantities,
} from './inventorySmash';

const TARGET_RAIDS = 5;

const PRIMARY_WEAPON_IDS = new Set(['rattler_ar', 'il_toro_sg', 'ferro_br']);
const SECONDARY_WEAPON_IDS = new Set(['anvil_hc']);

const LOADOUT_CATEGORIES = new Set([
  'weapon',
  'shield',
  'augment',
  'ammo',
  'healing',
  'tactical',
]);

function calculateFiveRaidReadiness(
  player: PlayerProgressState
): FiveRaidReadiness {
  let primaryWeaponsReady = player.loadout.primaryWeaponId ? 1 : 0;
  let secondaryWeaponsReady = player.loadout.secondaryWeaponId ? 1 : 0;
  let shieldsReady = player.loadout.shieldId ? 1 : 0;
  let augmentsReady = player.loadout.augmentId ? 1 : 0;
  let healingStacksReady = player.loadout.quickUseItemIds.filter(
    (id) => ITEMS_BY_ID[id]?.category === 'healing'
  ).length;
  let ammoStacksReady = player.loadout.ammoStacks.reduce(
    (sum, stack) => sum + stack.quantity,
    0
  );

  for (const slot of player.stash) {
    const item = ITEMS_BY_ID[slot.itemId];
    if (!item) continue;

    if (item.category === 'weapon') {
      if (SECONDARY_WEAPON_IDS.has(item.id)) {
        secondaryWeaponsReady += slot.quantity;
      } else if (PRIMARY_WEAPON_IDS.has(item.id)) {
        primaryWeaponsReady += slot.quantity;
      } else {
        primaryWeaponsReady += slot.quantity;
      }
    } else if (item.category === 'shield') {
      shieldsReady += slot.quantity;
    } else if (item.category === 'augment') {
      augmentsReady += slot.quantity;
    } else if (item.category === 'healing') {
      healingStacksReady += slot.quantity;
    } else if (item.category === 'ammo') {
      ammoStacksReady += slot.quantity;
    }
  }

  const overallReadyRaids = Math.min(
    TARGET_RAIDS,
    primaryWeaponsReady,
    secondaryWeaponsReady,
    shieldsReady,
    augmentsReady,
    healingStacksReady,
    ammoStacksReady
  );

  return {
    targetRaids: TARGET_RAIDS,
    primaryWeaponsReady,
    secondaryWeaponsReady,
    shieldsReady,
    augmentsReady,
    healingStacksReady,
    ammoStacksReady,
    overallReadyRaids,
  };
}

export function buildTab1PrepPlan(player: PlayerProgressState): Tab1PrepPlan {
  const readiness = calculateFiveRaidReadiness(player);
  const requirementsByItem = collectAllRequirementsByItem(player);
  const ownedMap = getOwnedStashQuantities(player);

  // ==========================================================================
  // RULE (a): Identify & lock all items required for FUTURE hideout upgrades,
  // active/future quests, uncompleted project stages, weapon upgrades, PLUS
  // any epic/legendary ARC parts.
  // ==========================================================================
  const protectedRareAndUpgradeItems: ProtectedItemEntry[] = [];
  const protectedQtyByItemId: Record<string, number> = {};

  for (const [itemId, ownedInfo] of Object.entries(ownedMap)) {
    const catalogItem = ITEMS_BY_ID[itemId];
    const reqs = requirementsByItem[itemId] ?? [];
    const futureReqs = reqs.filter((r) => r.status === 'future');
    const totalFutureNeeded = futureReqs.reduce(
      (sum, r) => sum + r.requiredQuantity,
      0
    );

    const isHighTierArcPart =
      catalogItem !== undefined &&
      catalogItem.category === 'arc_part' &&
      (catalogItem.rarity === 'epic' || catalogItem.rarity === 'legendary');

    if (totalFutureNeeded > 0 || isHighTierArcPart) {
      const protectedQuantity = isHighTierArcPart
        ? ownedInfo.quantity
        : Math.min(ownedInfo.quantity, totalFutureNeeded);

      protectedQtyByItemId[itemId] = protectedQuantity;

      const reasons = futureReqs.map((r) => ({
        label: r.label,
        category: r.category,
        neededQuantity: r.requiredQuantity,
      }));

      if (reasons.length === 0 && isHighTierArcPart && catalogItem) {
        reasons.push({
          label: `Protected ${catalogItem.rarity.toUpperCase()} ARC Part Reserve`,
          category: 'project',
          neededQuantity: ownedInfo.quantity,
        });
      }

      protectedRareAndUpgradeItems.push({
        itemId,
        itemName: catalogItem ? catalogItem.name : itemId,
        rarity: catalogItem ? catalogItem.rarity : 'common',
        ownedQuantity: ownedInfo.quantity,
        protectedQuantity,
        reasons,
      });
    }
  }

  // ==========================================================================
  // RULE (c): Sell immediately items with no future upgrade/quest/loadout utility
  // (e.g., vendor trinkets even if they were used in a past completed quest).
  // ==========================================================================
  const sellImmediatelyList: ImmediateSellEntry[] = [];

  for (const [itemId, ownedInfo] of Object.entries(ownedMap)) {
    const catalogItem = ITEMS_BY_ID[itemId];
    if (!catalogItem) continue;

    const protectedQty = protectedQtyByItemId[itemId] ?? 0;
    const unprotectedQty = Math.max(0, ownedInfo.quantity - protectedQty);
    if (unprotectedQty <= 0) continue;

    // Never sell active 5-raid loadout gear
    if (LOADOUT_CATEGORIES.has(catalogItem.category)) continue;

    // Vendor trinkets with no future utility are sold immediately for coins
    if (catalogItem.category === 'trinket') {
      const pastReqs = (requirementsByItem[itemId] ?? []).filter(
        (r) => r.status === 'past'
      );
      const pastContext =
        pastReqs.length > 0
          ? `Past requirement (${pastReqs.map((r) => r.label).join(', ')}) already completed. `
          : '';

      const slotsFreed =
        unprotectedQty === ownedInfo.quantity ? ownedInfo.slotsUsed : 0;

      sellImmediatelyList.push({
        itemId,
        itemName: catalogItem.name,
        rarity: catalogItem.rarity,
        quantityToSell: unprotectedQty,
        unitCoins: catalogItem.sellValueCoins,
        totalCoins: unprotectedQty * catalogItem.sellValueCoins,
        slotsFreed,
        reason: `${pastContext}Zero future quest, hideout, or 5-raid loadout utility — liquidate for ${
          unprotectedQty * catalogItem.sellValueCoins
        } Raider Coins.`,
      });
    }
  }

  // ==========================================================================
  // RULE (b): Recycle / Refine non-protected salvage & surplus materials and
  // Craft missing 5-raid loadout kits.
  // ==========================================================================
  const recycleRefineCraftQueue: PrepAction[] = [];
  let stepOrder = 1;

  // Track available unprotected crafting materials
  const availableCraftingPool: Record<string, number> = {};
  for (const [itemId, ownedInfo] of Object.entries(ownedMap)) {
    const protectedQty = protectedQtyByItemId[itemId] ?? 0;
    const unprotectedQty = Math.max(0, ownedInfo.quantity - protectedQty);
    if (unprotectedQty > 0) {
      availableCraftingPool[itemId] = unprotectedQty;
    }
  }

  const refineRecipesByIngredient: Record<
    string,
    (typeof CRAFTING_RECIPES)[number]
  > = {};
  for (const recipe of CRAFTING_RECIPES) {
    if (recipe.actionType === 'refine' && recipe.ingredients.length === 1) {
      refineRecipesByIngredient[recipe.ingredients[0].itemId] = recipe;
    }
  }

  // Step 1: Break down non-protected salvage scrap (`damaged_optics`, `frayed_wiring`, `rusted_gear_casing`)
  // and any other non-protected salvage items that yield base crafting components.
  const SALVAGE_PRIORITY_IDS = new Set([
    'damaged_optics',
    'frayed_wiring',
    'rusted_gear_casing',
  ]);

  for (const [itemId, ownedInfo] of Object.entries(ownedMap)) {
    const catalogItem = ITEMS_BY_ID[itemId];
    if (!catalogItem) continue;
    if (LOADOUT_CATEGORIES.has(catalogItem.category)) continue;
    if (catalogItem.category === 'trinket') continue;

    const protectedQty = protectedQtyByItemId[itemId] ?? 0;
    const unprotectedQty = Math.max(0, ownedInfo.quantity - protectedQty);
    if (unprotectedQty <= 0) continue;

    const isSalvageScrap = SALVAGE_PRIORITY_IDS.has(itemId);
    if (!isSalvageScrap) continue;

    const refineRecipe = refineRecipesByIngredient[itemId];
    const stationLevel = refineRecipe
      ? (player.hideoutLevels[refineRecipe.stationId] ?? 1)
      : 0;

    // Use REFINE for rusted_gear_casing (higher metal yield) and RECYCLE for multi-component salvage (`damaged_optics`, `frayed_wiring`)
    const useRefine =
      refineRecipe !== undefined &&
      stationLevel >= refineRecipe.requiredStationLevel &&
      itemId === 'rusted_gear_casing';

    const outputs: Array<{
      itemId: string;
      itemName: string;
      quantity: number;
    }> = [];

    if (useRefine && refineRecipe) {
      const outQty = unprotectedQty * refineRecipe.outputQuantity;
      const outCatalog = ITEMS_BY_ID[refineRecipe.outputItemId];
      outputs.push({
        itemId: refineRecipe.outputItemId,
        itemName: outCatalog ? outCatalog.name : refineRecipe.outputItemId,
        quantity: outQty,
      });
      availableCraftingPool[refineRecipe.outputItemId] =
        (availableCraftingPool[refineRecipe.outputItemId] ?? 0) + outQty;
    } else if (catalogItem.recycleYields.length > 0) {
      for (const yieldSpec of catalogItem.recycleYields) {
        const outQty = unprotectedQty * yieldSpec.quantity;
        const outCatalog = ITEMS_BY_ID[yieldSpec.itemId];
        outputs.push({
          itemId: yieldSpec.itemId,
          itemName: outCatalog ? outCatalog.name : yieldSpec.itemId,
          quantity: outQty,
        });
        availableCraftingPool[yieldSpec.itemId] =
          (availableCraftingPool[yieldSpec.itemId] ?? 0) + outQty;
      }
    }

    if (outputs.length > 0) {
      availableCraftingPool[itemId] = 0;
      const slotsFreed =
        unprotectedQty === ownedInfo.quantity ? ownedInfo.slotsUsed : 0;

      recycleRefineCraftQueue.push({
        id: `${useRefine ? 'refine' : 'recycle'}_${itemId}`,
        stepOrder: stepOrder++,
        kind: useRefine ? 'REFINE' : 'RECYCLE',
        title: `${useRefine ? 'Refine' : 'Recycle'} ${unprotectedQty}x ${
          catalogItem.name
        }`,
        sourceItemId: itemId,
        sourceItemName: catalogItem.name,
        sourceQuantity: unprotectedQty,
        outputs,
        slotsFreed,
        reason: `Unprotected salvage with zero future quest/hideout requirements. Converts into ${outputs
          .map((o) => `${o.quantity}x ${o.itemName}`)
          .join(' + ')} for 5-raid loadout kits and frees ${slotsFreed} stash slot(s).`,
      });
    }
  }

  // Step 2: Craft missing 5-raid loadout kits using ONLY unprotected materials in `availableCraftingPool`
  const craftTargets: Array<{
    recipeId: string;
    missingCount: number;
    reasonLabel: string;
  }> = [
    {
      recipeId: 'craft_light_shield',
      missingCount: Math.max(0, TARGET_RAIDS - readiness.shieldsReady),
      reasonLabel: `Reach ${TARGET_RAIDS}-raid shield readiness (${readiness.shieldsReady}/${TARGET_RAIDS} ready)`,
    },
    {
      recipeId: 'craft_combat_augment_mk1',
      missingCount: Math.max(0, TARGET_RAIDS - readiness.augmentsReady),
      reasonLabel: `Reach ${TARGET_RAIDS}-raid augment readiness (${readiness.augmentsReady}/${TARGET_RAIDS} ready)`,
    },
    {
      recipeId: 'craft_rattler_ar',
      missingCount: Math.max(0, TARGET_RAIDS - readiness.primaryWeaponsReady),
      reasonLabel: `Reach ${TARGET_RAIDS}-raid primary weapon readiness (${readiness.primaryWeaponsReady}/${TARGET_RAIDS} ready)`,
    },
    {
      recipeId: 'craft_anvil_hc',
      missingCount: Math.max(0, TARGET_RAIDS - readiness.secondaryWeaponsReady),
      reasonLabel: `Reach ${TARGET_RAIDS}-raid sidearm readiness (${readiness.secondaryWeaponsReady}/${TARGET_RAIDS} ready)`,
    },
    {
      recipeId: 'craft_shield_recharger',
      missingCount: Math.max(1, TARGET_RAIDS - readiness.healingStacksReady),
      reasonLabel: `Top up ${TARGET_RAIDS}-raid quick-use shield & trauma sustain`,
    },
  ];

  for (const target of craftTargets) {
    if (target.missingCount <= 0) continue;
    const recipe = CRAFTING_RECIPES.find((r) => r.id === target.recipeId);
    if (!recipe) continue;

    // Determine how many batches we can afford from unprotected materials
    let craftableBatches = target.missingCount;
    for (const ing of recipe.ingredients) {
      const avail = availableCraftingPool[ing.itemId] ?? 0;
      const maxForIng = Math.floor(avail / ing.quantity);
      craftableBatches = Math.min(craftableBatches, maxForIng);
    }

    if (craftableBatches <= 0) continue;

    // Deduct from availableCraftingPool
    for (const ing of recipe.ingredients) {
      availableCraftingPool[ing.itemId] -= craftableBatches * ing.quantity;
    }

    const primaryIng = recipe.ingredients[0];
    const primaryIngCatalog = ITEMS_BY_ID[primaryIng.itemId];
    const outputCatalog = ITEMS_BY_ID[recipe.outputItemId];
    const totalOutQty = craftableBatches * recipe.outputQuantity;

    recycleRefineCraftQueue.push({
      id: `${recipe.id}_batch`,
      stepOrder: stepOrder++,
      kind: 'CRAFT',
      title: `Craft ${totalOutQty}x ${
        outputCatalog ? outputCatalog.name : recipe.outputItemId
      } at ${recipe.stationName}`,
      sourceItemId: primaryIng.itemId,
      sourceItemName: primaryIngCatalog
        ? primaryIngCatalog.name
        : primaryIng.itemId,
      sourceQuantity: craftableBatches * primaryIng.quantity,
      outputs: [
        {
          itemId: recipe.outputItemId,
          itemName: outputCatalog ? outputCatalog.name : recipe.outputItemId,
          quantity: totalOutQty,
        },
      ],
      slotsFreed: 0,
      reason: `${target.reasonLabel} using reclaimed scrap materials (${recipe.ingredients
        .map(
          (i) =>
            `${craftableBatches * i.quantity}x ${
              ITEMS_BY_ID[i.itemId]?.name ?? i.itemId
            }`
        )
        .join(' + ')}).`,
    });
  }

  const totalProjectedCoinsFromSales = sellImmediatelyList.reduce(
    (sum, entry) => sum + entry.totalCoins,
    0
  );

  const totalStashSlotsFreed =
    sellImmediatelyList.reduce((sum, entry) => sum + entry.slotsFreed, 0) +
    recycleRefineCraftQueue.reduce((sum, action) => sum + action.slotsFreed, 0);

  const agentTacticalSummary = `5-Raid Readiness: ${readiness.overallReadyRaids}/${TARGET_RAIDS} complete kits currently staged. Locked ${protectedRareAndUpgradeItems.length} upgrade/rare item stacks in stash (Rule a), queued ${recycleRefineCraftQueue.length} recycle/refine/craft operations to assemble missing 5-raid shields, augments, and weapons (Rule b), and flagged ${sellImmediatelyList.length} vendor trinket stack(s) for immediate sale yielding ${totalProjectedCoinsFromSales.toLocaleString()} Raider Coins and freeing ${totalStashSlotsFreed} stash slots (Rule c).`;

  return {
    readiness,
    protectedRareAndUpgradeItems,
    recycleRefineCraftQueue,
    sellImmediatelyList,
    totalProjectedCoinsFromSales,
    totalStashSlotsFreed,
    agentTacticalSummary,
  };
}
