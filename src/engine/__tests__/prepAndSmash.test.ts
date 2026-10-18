import { describe, expect, it } from 'vitest';
import {
  CATALOG_ITEMS,
  CRAFTING_RECIPES,
  DEFAULT_LIVE_MAP_CONDITIONS,
  DEMO_PLAYER_STATE,
  HIDEOUT_REQUIREMENTS,
  ITEMS_BY_ID,
  PROJECT_STAGES,
  QUEST_REQUIREMENTS,
} from '../../data/gameCatalog';
import { buildTab1PrepPlan } from '../prepIntelligence';
import { buildTab2RaidPlan } from '../raidPlanner';
import { buildTab3InventorySmashPlan } from '../inventorySmash';

describe('ARC Raiders Game Catalog Integrity', () => {
  it('exports all required authentic ARC Raiders items with dropLocations and recycleYields', () => {
    const requiredItemIds = [
      'rattler_ar',
      'anvil_hc',
      'il_toro_sg',
      'ferro_br',
      'light_shield',
      'medium_shield',
      'combat_augment_mk1',
      'looter_augment_mk2',
      'medium_ammo',
      'heavy_ammo',
      'shotgun_ammo',
      'antiseptic_kit',
      'shield_recharger',
      'smoke_grenade',
      'arc_alloy',
      'arc_powercell',
      'durable_cloth',
      'antiseptic',
      'metal_parts',
      'rubber_parts',
      'electronic_components',
      'leaper_pulse_unit',
      'wasp_driver',
      'hornet_driver',
      'bombardier_cell',
      'snitch_scanner',
      'tellurion',
      'radio_relay',
      'fireball_burner',
      'damaged_optics',
      'frayed_wiring',
      'rusted_gear_casing',
      'bronze_statuette',
      'fine_wristwatch',
      'red_coral_jewelry',
      'music_box',
    ];

    expect(CATALOG_ITEMS.length).toBeGreaterThanOrEqual(requiredItemIds.length);

    for (const id of requiredItemIds) {
      const item = ITEMS_BY_ID[id];
      expect(item, `Missing catalog item ${id}`).toBeDefined();
      expect(item.dropLocations.length).toBeGreaterThan(0);
      expect(Array.isArray(item.recycleYields)).toBe(true);
    }

    expect(ITEMS_BY_ID['bronze_statuette'].sellValueCoins).toBe(1800);
    expect(ITEMS_BY_ID['fine_wristwatch'].sellValueCoins).toBe(2400);
    expect(ITEMS_BY_ID['red_coral_jewelry'].sellValueCoins).toBe(3200);
    expect(ITEMS_BY_ID['music_box'].sellValueCoins).toBe(1500);
    expect(ITEMS_BY_ID['tellurion'].rarity).toBe('legendary');
    expect(ITEMS_BY_ID['leaper_pulse_unit'].rarity).toBe('epic');
    expect(ITEMS_BY_ID['bombardier_cell'].rarity).toBe('epic');
  });

  it('exports recipes, hideout levels, quests, project stages, live map conditions, and 18-slot demo player state', () => {
    expect(CRAFTING_RECIPES.length).toBeGreaterThanOrEqual(10);
    expect(HIDEOUT_REQUIREMENTS.length).toBe(15);
    expect(QUEST_REQUIREMENTS.length).toBeGreaterThanOrEqual(7);
    expect(PROJECT_STAGES.length).toBe(3);
    expect(DEFAULT_LIVE_MAP_CONDITIONS.length).toBe(5);
    expect(DEMO_PLAYER_STATE.stash.length).toBe(18);
  });
});

describe('Tab 1: Prep Intelligence (5-Raid Loadouts + Rules a, b, c)', () => {
  it('calculates 5-raid loadout readiness accurately', () => {
    const plan = buildTab1PrepPlan(DEMO_PLAYER_STATE);

    expect(plan.readiness.targetRaids).toBe(5);
    expect(plan.readiness.primaryWeaponsReady).toBe(4);
    expect(plan.readiness.secondaryWeaponsReady).toBe(3);
    expect(plan.readiness.shieldsReady).toBe(3);
    expect(plan.readiness.augmentsReady).toBe(3);
    expect(plan.readiness.healingStacksReady).toBe(5);
    expect(plan.readiness.ammoStacksReady).toBe(6);
    expect(plan.readiness.overallReadyRaids).toBe(3);
  });

  it('Rule (a): protects all future upgrade/quest/project items and epic/legendary ARC parts and never recycles or sells them', () => {
    const plan = buildTab1PrepPlan(DEMO_PLAYER_STATE);

    const protectedIds = new Set(
      plan.protectedRareAndUpgradeItems.map((p) => p.itemId)
    );

    expect(protectedIds.has('leaper_pulse_unit')).toBe(true);
    expect(protectedIds.has('wasp_driver')).toBe(true);
    expect(protectedIds.has('hornet_driver')).toBe(true);
    expect(protectedIds.has('tellurion')).toBe(true);
    expect(protectedIds.has('arc_alloy')).toBe(true);
    expect(protectedIds.has('durable_cloth')).toBe(true);

    // None of the fully-protected items may appear as source items in recycleRefineCraftQueue or sellImmediatelyList
    for (const protectedEntry of plan.protectedRareAndUpgradeItems) {
      if (protectedEntry.protectedQuantity >= protectedEntry.ownedQuantity) {
        const usedInQueue = plan.recycleRefineCraftQueue.some(
          (a) => a.sourceItemId === protectedEntry.itemId
        );
        const usedInSell = plan.sellImmediatelyList.some(
          (s) => s.itemId === protectedEntry.itemId
        );
        expect(usedInQueue).toBe(false);
        expect(usedInSell).toBe(false);
      }
    }
  });

  it('Rule (b): recycles/refines non-protected salvage scrap and crafts missing 5-raid loadout kits while freeing slots', () => {
    const plan = buildTab1PrepPlan(DEMO_PLAYER_STATE);

    const sourceIds = plan.recycleRefineCraftQueue.map((a) => a.sourceItemId);
    expect(sourceIds).toContain('damaged_optics');
    expect(sourceIds).toContain('frayed_wiring');
    expect(sourceIds).toContain('rusted_gear_casing');

    const craftActions = plan.recycleRefineCraftQueue.filter(
      (a) => a.kind === 'CRAFT'
    );
    expect(craftActions.length).toBeGreaterThan(0);

    const craftedOutputIds = craftActions.flatMap((a) =>
      a.outputs.map((o) => o.itemId)
    );
    expect(craftedOutputIds).toContain('light_shield');
    expect(craftedOutputIds).toContain('combat_augment_mk1');

    const freedByRecycleAndRefine = plan.recycleRefineCraftQueue.reduce(
      (sum, a) => sum + a.slotsFreed,
      0
    );
    expect(freedByRecycleAndRefine).toBeGreaterThanOrEqual(3);
  });

  it('Rule (c): identifies vendor trinkets with no future utility (even if used in past completed quests) for immediate sale', () => {
    const customPlayer = {
      ...DEMO_PLAYER_STATE,
      stash: [
        ...DEMO_PLAYER_STATE.stash,
        { slotIndex: 18, itemId: 'red_coral_jewelry', quantity: 1 },
        { slotIndex: 19, itemId: 'music_box', quantity: 2 },
      ],
    };

    const plan = buildTab1PrepPlan(customPlayer);
    const sellById = Object.fromEntries(
      plan.sellImmediatelyList.map((s) => [s.itemId, s])
    );

    expect(sellById['bronze_statuette']).toBeDefined();
    expect(sellById['bronze_statuette'].unitCoins).toBe(1800);
    expect(sellById['bronze_statuette'].totalCoins).toBe(3600);
    expect(sellById['bronze_statuette'].slotsFreed).toBe(1);

    expect(sellById['fine_wristwatch']).toBeDefined();
    expect(sellById['fine_wristwatch'].unitCoins).toBe(2400);
    expect(sellById['fine_wristwatch'].totalCoins).toBe(2400);

    expect(sellById['red_coral_jewelry']).toBeDefined();
    expect(sellById['red_coral_jewelry'].unitCoins).toBe(3200);
    expect(sellById['red_coral_jewelry'].totalCoins).toBe(3200);

    expect(sellById['music_box']).toBeDefined();
    expect(sellById['music_box'].unitCoins).toBe(1500);
    expect(sellById['music_box'].totalCoins).toBe(3000);

    expect(plan.totalProjectedCoinsFromSales).toBe(3600 + 2400 + 3200 + 3000);
  });
});

describe('Tab 2: Top 3 Raid Ideas (Map Conditions + Doable 4-Step Routes)', () => {
  it('returns Top 3 Raid Ideas ranked 1, 2, 3 with 4 detailed steps each and doableWithCurrentLoadout = true', () => {
    const raidPlan = buildTab2RaidPlan(DEMO_PLAYER_STATE);

    expect(raidPlan.topRaidIdeas).toHaveLength(3);
    expect(raidPlan.topRaidIdeas.map((r) => r.rank)).toEqual([1, 2, 3]);

    for (const idea of raidPlan.topRaidIdeas) {
      expect(idea.doableWithCurrentLoadout).toBe(true);
      expect(idea.steps).toHaveLength(4);
      expect(idea.steps.map((s) => s.phase)).toEqual([
        'Insertion',
        'Primary Objective',
        'High-Value Loot',
        'Extraction',
      ]);
      expect(idea.targetedMissingItems.length).toBeGreaterThan(0);
    }
  });
});

describe('Tab 3: Inventory Smash (Past Grey vs Future Colored + Missing Items)', () => {
  it('annotates every stash item with past (completed) and future (uncompleted) requirements across all categories', () => {
    const smashPlan = buildTab3InventorySmashPlan(DEMO_PLAYER_STATE);

    expect(smashPlan.annotatedInventory).toHaveLength(18);

    const bronzeAnnotated = smashPlan.annotatedInventory.find(
      (i) => i.itemId === 'bronze_statuette'
    );
    expect(bronzeAnnotated).toBeDefined();
    expect(
      bronzeAnnotated!.requirements.every((r) => r.status === 'past')
    ).toBe(true);
    expect(bronzeAnnotated!.requirements.length).toBeGreaterThan(0);

    const leaperAnnotated = smashPlan.annotatedInventory.find(
      (i) => i.itemId === 'leaper_pulse_unit'
    );
    expect(leaperAnnotated).toBeDefined();
    expect(
      leaperAnnotated!.requirements.some(
        (r) => r.status === 'future' && r.category === 'quest'
      )
    ).toBe(true);
    expect(
      leaperAnnotated!.requirements.some(
        (r) => r.status === 'future' && r.category === 'hideout_upgrade'
      )
    ).toBe(true);
    expect(
      leaperAnnotated!.requirements.some(
        (r) => r.status === 'future' && r.category === 'project'
      )
    ).toBe(true);

    const waspAnnotated = smashPlan.annotatedInventory.find(
      (i) => i.itemId === 'wasp_driver'
    );
    expect(waspAnnotated).toBeDefined();
    expect(
      waspAnnotated!.requirements.some(
        (r) => r.status === 'future' && r.category === 'weapon_upgrade'
      )
    ).toBe(true);
  });

  it('computes missingRequiredItems with exact missingQuantity = requiredQuantity - ownedQuantity and bestPlacesToFind', () => {
    const smashPlan = buildTab3InventorySmashPlan(DEMO_PLAYER_STATE);

    expect(smashPlan.missingRequiredItems.length).toBeGreaterThan(0);

    for (const missing of smashPlan.missingRequiredItems) {
      expect(missing.ownedQuantity).toBeLessThan(missing.requiredQuantity);
      expect(missing.missingQuantity).toBe(
        missing.requiredQuantity - missing.ownedQuantity
      );
      expect(missing.bestPlacesToFind.length).toBeGreaterThan(0);
      expect(missing.requiredFor.length).toBeGreaterThan(0);
    }

    const tellurionMissing = smashPlan.missingRequiredItems.find(
      (m) => m.itemId === 'tellurion'
    );
    expect(tellurionMissing).toBeDefined();
    expect(tellurionMissing!.ownedQuantity).toBe(1);
    expect(tellurionMissing!.requiredQuantity).toBe(5);
    expect(tellurionMissing!.missingQuantity).toBe(4);
  });
});
