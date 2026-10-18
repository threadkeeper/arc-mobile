import {
  HIDEOUT_REQUIREMENTS,
  ITEMS_BY_ID,
  PROJECT_STAGES,
  QUEST_REQUIREMENTS,
  WEAPON_UPGRADE_REQUIREMENTS,
} from '../data/gameCatalog';
import {
  AnnotatedInventoryItem,
  MissingRequirementItem,
  PlayerProgressState,
  RequirementReference,
  Tab3InventorySmashPlan,
} from '../shared/types';

const LOADOUT_CATEGORIES = new Set([
  'weapon',
  'shield',
  'augment',
  'ammo',
  'healing',
  'tactical',
]);

/**
 * Collects all past (completed) and future (uncompleted) requirement references
 * indexed by itemId across quests, hideout upgrades, project stages, and weapon upgrades.
 */
export function collectAllRequirementsByItem(
  player: PlayerProgressState
): Record<string, RequirementReference[]> {
  const byItem: Record<string, RequirementReference[]> = {};

  const pushReq = (itemId: string, ref: RequirementReference) => {
    if (!byItem[itemId]) {
      byItem[itemId] = [];
    }
    byItem[itemId].push(ref);
  };

  // 1. Quests
  const completedQuests = new Set(player.completedQuestIds);
  for (const quest of QUEST_REQUIREMENTS) {
    const isPast = completedQuests.has(quest.questId);
    for (const reqItem of quest.requiredItems) {
      pushReq(reqItem.itemId, {
        id: quest.questId,
        label: `Quest: ${quest.questName} (${quest.traderName})`,
        category: 'quest',
        status: isPast ? 'past' : 'future',
        requiredQuantity: reqItem.quantity,
      });
    }
  }

  // 2. Hideout Upgrades
  for (const hideoutReq of HIDEOUT_REQUIREMENTS) {
    const currentStationLevel = player.hideoutLevels[hideoutReq.stationId] ?? 0;
    const isPast = hideoutReq.level <= currentStationLevel;
    for (const reqItem of hideoutReq.requiredItems) {
      pushReq(reqItem.itemId, {
        id: `hideout_${hideoutReq.stationId}_lv${hideoutReq.level}`,
        label: `${hideoutReq.stationName} Lv.${hideoutReq.level}`,
        category: 'hideout_upgrade',
        status: isPast ? 'past' : 'future',
        requiredQuantity: reqItem.quantity,
      });
    }
  }

  // 3. Project Stages
  for (const stage of PROJECT_STAGES) {
    const completedStage = player.completedProjectStages[stage.projectId] ?? 0;
    const isPast = stage.stageNumber <= completedStage;
    for (const reqItem of stage.requiredItems) {
      pushReq(reqItem.itemId, {
        id: `${stage.projectId}_stage_${stage.stageNumber}`,
        label: `${stage.projectName} (Stage ${stage.stageNumber})`,
        category: 'project',
        status: isPast ? 'past' : 'future',
        requiredQuantity: reqItem.quantity,
      });
    }
  }

  // 4. Weapon Upgrades
  const learnedSet = new Set(player.learnedBlueprintIds);
  for (const weaponUpgrade of WEAPON_UPGRADE_REQUIREMENTS) {
    const isPast = learnedSet.has(weaponUpgrade.id);
    for (const reqItem of weaponUpgrade.requiredItems) {
      pushReq(reqItem.itemId, {
        id: weaponUpgrade.id,
        label: `Weapon Upgrade: ${weaponUpgrade.weaponName}`,
        category: 'weapon_upgrade',
        status: isPast ? 'past' : 'future',
        requiredQuantity: reqItem.quantity,
      });
    }
  }

  return byItem;
}

/**
 * Sums owned quantity of each item across the player's stash slots.
 */
export function getOwnedStashQuantities(
  player: PlayerProgressState
): Record<string, { quantity: number; slotsUsed: number }> {
  const summary: Record<string, { quantity: number; slotsUsed: number }> = {};
  for (const slot of player.stash) {
    if (!summary[slot.itemId]) {
      summary[slot.itemId] = { quantity: 0, slotsUsed: 0 };
    }
    summary[slot.itemId].quantity += slot.quantity;
    summary[slot.itemId].slotsUsed += 1;
  }
  return summary;
}

function buildSafeActionSummary(
  itemId: string,
  ownedQuantity: number,
  requirements: RequirementReference[]
): string {
  const catalogItem = ITEMS_BY_ID[itemId];
  const futureReqs = requirements.filter((r) => r.status === 'future');
  const pastReqs = requirements.filter((r) => r.status === 'past');
  const totalFutureNeeded = futureReqs.reduce(
    (sum, r) => sum + r.requiredQuantity,
    0
  );

  if (
    catalogItem &&
    catalogItem.category === 'arc_part' &&
    (catalogItem.rarity === 'epic' || catalogItem.rarity === 'legendary')
  ) {
    return `LOCK IN STASH: High-tier ${catalogItem.rarity.toUpperCase()} ARC part (${totalFutureNeeded} needed for upcoming progression). Never sell or recycle.`;
  }

  if (totalFutureNeeded > 0) {
    if (ownedQuantity <= totalFutureNeeded) {
      return `KEEP ALL (${ownedQuantity}/${totalFutureNeeded}): Required for ${futureReqs.length} upcoming progression goal(s).`;
    }
    const surplus = ownedQuantity - totalFutureNeeded;
    return `PROTECT ${totalFutureNeeded}, SURPLUS ${surplus}: Reserve ${totalFutureNeeded} for future upgrades; ${surplus} safe for 5-raid crafting.`;
  }

  if (catalogItem && LOADOUT_CATEGORIES.has(catalogItem.category)) {
    return `KEEP FOR 5-RAID LOADOUTS: Active combat kit readiness reserve.`;
  }

  if (catalogItem && catalogItem.category === 'key') {
    return `LOCK IN STASH: High-security raid room keycard. Bring in Augment Safe Pocket on matching map.`;
  }

  if (catalogItem && catalogItem.category === 'trinket') {
    const pastNote =
      pastReqs.length > 0
        ? `All ${pastReqs.length} past quest requirement(s) completed (grey). `
        : '';
    return `SELL IMMEDIATELY: ${pastNote}Yields ${
      ownedQuantity * catalogItem.sellValueCoins
    } Raider Coins and frees stash space.`;
  }

  const pastNote =
    pastReqs.length > 0
      ? `Past requirement(s) already completed (grey). `
      : '';
  return `SAFE TO RECYCLE / REFINE: ${pastNote}Break down into core parts for 5-raid loadout crafting.`;
}

export function buildTab3InventorySmashPlan(
  player: PlayerProgressState
): Tab3InventorySmashPlan {
  const requirementsByItem = collectAllRequirementsByItem(player);
  const ownedMap = getOwnedStashQuantities(player);

  // Build annotatedInventory preserving order of appearance in player.stash
  const seenItemIds = new Set<string>();
  const annotatedInventory: AnnotatedInventoryItem[] = [];

  for (const slot of player.stash) {
    if (seenItemIds.has(slot.itemId)) {
      continue;
    }
    seenItemIds.add(slot.itemId);

    const catalogItem = ITEMS_BY_ID[slot.itemId];
    const ownedInfo = ownedMap[slot.itemId] ?? {
      quantity: slot.quantity,
      slotsUsed: 1,
    };
    const itemReqs = requirementsByItem[slot.itemId] ?? [];

    annotatedInventory.push({
      itemId: slot.itemId,
      itemName: catalogItem ? catalogItem.name : slot.itemId,
      rarity: catalogItem ? catalogItem.rarity : 'common',
      category: catalogItem ? catalogItem.category : 'material',
      ownedQuantity: ownedInfo.quantity,
      slotsUsed: ownedInfo.slotsUsed,
      requirements: itemReqs,
      safeActionSummary: buildSafeActionSummary(
        slot.itemId,
        ownedInfo.quantity,
        itemReqs
      ),
    });
  }

  // Build missingRequiredItems for every item with future requirements where ownedQuantity < requiredQuantity
  const missingRequiredItems: MissingRequirementItem[] = [];

  for (const [itemId, reqList] of Object.entries(requirementsByItem)) {
    const futureReqs = reqList.filter((r) => r.status === 'future');
    if (futureReqs.length === 0) {
      continue;
    }

    const requiredQuantity = futureReqs.reduce(
      (sum, r) => sum + r.requiredQuantity,
      0
    );
    const ownedQuantity = ownedMap[itemId]?.quantity ?? 0;

    if (ownedQuantity < requiredQuantity) {
      const catalogItem = ITEMS_BY_ID[itemId];
      missingRequiredItems.push({
        itemId,
        itemName: catalogItem ? catalogItem.name : itemId,
        rarity: catalogItem ? catalogItem.rarity : 'common',
        ownedQuantity,
        requiredQuantity,
        missingQuantity: requiredQuantity - ownedQuantity,
        requiredFor: futureReqs.map((r) => ({
          id: r.id,
          label: r.label,
          category: r.category,
          quantityNeeded: r.requiredQuantity,
        })),
        bestPlacesToFind: catalogItem ? catalogItem.dropLocations : [],
      });
    }
  }

  // Sort missing items by rarity priority and missing count
  const rarityWeight: Record<string, number> = {
    legendary: 5,
    epic: 4,
    rare: 3,
    uncommon: 2,
    common: 1,
  };
  missingRequiredItems.sort((a, b) => {
    const rDiff = (rarityWeight[b.rarity] ?? 0) - (rarityWeight[a.rarity] ?? 0);
    if (rDiff !== 0) return rDiff;
    return b.missingQuantity - a.missingQuantity;
  });

  const topMissingNames = missingRequiredItems
    .slice(0, 3)
    .map((m) => `${m.itemName} (need ${m.missingQuantity} more)`)
    .join(', ');

  const agentFarmingTip =
    missingRequiredItems.length > 0
      ? `Prioritize ${topMissingNames}. Target Dam Battleground (Red Lakes & Research) for Leaper Pulse Units/Wasp Drivers and The Spaceport (Control Tower A6 & Rocket Hangar) for Hornet Drivers, Radio Relays, and Tellurion.`
      : 'All upcoming hideout, quest, and project item requirements are fully stocked in your Speranza stash!';

  return {
    annotatedInventory,
    missingRequiredItems,
    agentFarmingTip,
  };
}
