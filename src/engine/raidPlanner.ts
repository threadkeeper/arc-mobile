import { DEFAULT_LIVE_MAP_CONDITIONS, ITEMS_BY_ID } from '../data/gameCatalog';
import {
  LiveMapCondition,
  MissingRequirementItem,
  PlayerProgressState,
  RaidIdeaCard,
  RaidStep,
  Tab2RaidPlan,
} from '../shared/types';
import { buildTab3InventorySmashPlan } from './inventorySmash';

interface MapRouteTemplate {
  mapSlug: string;
  mapName: string;
  defaultTitle: string;
  estimatedCoinYield: string;
  baseExcitement: number;
  expectedRewards: string[];
  buildSteps: (
    condition: LiveMapCondition,
    targetedMissingNames: string[]
  ) => RaidStep[];
}

const MAP_ROUTE_TEMPLATES: Record<string, MapRouteTemplate> = {
  'dam-battleground': {
    mapSlug: 'dam-battleground',
    mapName: 'Dam Battleground',
    defaultTitle: 'Red Lakes Leaper Hunt & Swarm Telemetry Sweep',
    estimatedCoinYield: '9,500 – 14,200 Coins',
    baseExcitement: 96,
    expectedRewards: [
      'Leaper Pulse Unit',
      'Wasp Driver',
      'Snitch Scanner',
      'ARC Alloy',
    ],
    buildSteps: (condition, targetedMissingNames) => [
      {
        stepNumber: 1,
        phase: 'Insertion',
        instruction: `Drop at South Spillway ridge under ${condition.activeCondition} cover and advance north toward Water Treatment Control using medium-range rifle overwatch.`,
        targetPoi: 'Water Treatment Control',
        cautionNote:
          'Destroy roaming Snitch Drones within 6 seconds of detection before they trigger an orbital Wasp reinforcement drop.',
      },
      {
        stepNumber: 2,
        phase: 'Primary Objective',
        instruction: `Sweep Research & Administration rooftops to eliminate Wasp Scouts and Snitch patrols for ${
          targetedMissingNames.slice(0, 2).join(' and ') ||
          'Wasp Drivers & Snitch Scanners'
        } (Quest: Grounded Swarm & Tech Bench Lv.2).`,
        targetPoi: 'Research & Administration',
        cautionNote:
          'Use indoor stairwell bottlenecks if electromagnetic storm arcs temporarily reduce shield visibility.',
      },
      {
        stepNumber: 3,
        phase: 'High-Value Loot',
        instruction:
          'Rotate down into Red Lakes Basin to bait and stagger the patrolling Leaper Unit with Anvil Hand Cannon shots to its exposed leg joints, then strip its Leaper Pulse Unit and Hydroponic Dome Antiseptic caches.',
        targetPoi: 'Red Lakes Basin & Hydroponic Dome Complex',
        cautionNote:
          'Save a Smoke Grenade and full stamina bar to dodge the Leaper kinetic slam shockwave.',
      },
      {
        stepNumber: 4,
        phase: 'Extraction',
        instruction:
          'Pop smoke on the Spillway Cargo Elevator pad at the 15-second siren mark and extract back to Speranza with rare cores locked in your Looter Augment safe pocket.',
        targetPoi: 'Spillway Cargo Elevator',
        cautionNote:
          'Watch the upper dam catwalks for third-party Raiders camping the elevator audio cue.',
      },
    ],
  },
  'the-spaceport': {
    mapSlug: 'the-spaceport',
    mapName: 'The Spaceport',
    defaultTitle: 'Control Tower A6 Relay & Hornet Interceptor Run',
    estimatedCoinYield: '12,800 – 18,500 Coins',
    baseExcitement: 94,
    expectedRewards: [
      'Hornet Driver',
      'Radio Relay',
      'ARC Powercell',
      'Tellurion',
    ],
    buildSteps: (condition, targetedMissingNames) => [
      {
        stepNumber: 1,
        phase: 'Insertion',
        instruction: `Infiltrate via the Perimeter Service Trench during ${condition.activeCondition} and clear the Power Substation battery racks for ARC Powercells.`,
        targetPoi: 'Power Substation',
        cautionNote:
          'Avoid crossing the open runway apron where Bastion rotary guns have unobstructed sightlines.',
      },
      {
        stepNumber: 2,
        phase: 'Primary Objective',
        instruction: `Ascend Control Tower A6 comms deck to loot Signal Technician Lockers and engage Hornet Interceptors from covered balconies for ${
          targetedMissingNames.slice(0, 2).join(' and ') ||
          'Hornet Drivers & Radio Relays'
        }.`,
        targetPoi: 'Control Tower A6 & Radar Array',
        cautionNote:
          'Focus fire on a single Hornet thruster pod with the Anvil Hand Cannon to ground it immediately.',
      },
      {
        stepNumber: 3,
        phase: 'High-Value Loot',
        instruction:
          'Breach the Rocket Assembly Hangar telemetry vault and Departure VIP Lounge safes for Tellurion conductors, Bombardier Cells, and Fine Wristwatches.',
        targetPoi: 'Rocket Assembly Hangar',
        cautionNote:
          'Keep a Shield Recharger bound to quick-use slot 1 before entering the Hangar catwalks.',
      },
      {
        stepNumber: 4,
        phase: 'Extraction',
        instruction:
          'Disengage through the underground fuel conduit and call the West Apron Metro Lift for a covered extraction.',
        targetPoi: 'West Apron Metro Lift',
        cautionNote:
          'Deploy smoke inside the lift threshold 3 seconds before the blast doors cycle shut.',
      },
    ],
  },
  'buried-city': {
    mapSlug: 'buried-city',
    mapName: 'Buried City',
    defaultTitle: 'Sunken Hospital Trauma Sweep & Metro Fireball Purge',
    estimatedCoinYield: '8,400 – 13,000 Coins',
    baseExcitement: 90,
    expectedRewards: [
      'Antiseptic',
      'Fireball Burner',
      'Durable Cloth',
      'Red Coral Jewelry',
    ],
    buildSteps: (condition, targetedMissingNames) => [
      {
        stepNumber: 1,
        phase: 'Insertion',
        instruction: `Enter the Residential Quarter alleys under ${condition.activeCondition} and loot apartment wardrobes for Durable Cloth stacks.`,
        targetPoi: 'Residential Quarter',
        cautionNote:
          'Listen for indoor Tick skittering audio cues when breaching dark second-floor bedrooms.',
      },
      {
        stepNumber: 2,
        phase: 'Primary Objective',
        instruction: `Clear the Sunken Hospital triage wing and Pharmacy Row refrigerators to secure ${
          targetedMissingNames.slice(0, 2).join(' and ') ||
          'Antiseptic & Fireball Burners'
        } for Medical Station Lv.2/3 and Lance's Apex Predator Autopsy quest.`,
        targetPoi: 'Sunken Hospital & Pharmacy Row',
        cautionNote:
          'Hold close angles with the Rattler I or Il Toro Shotgun along the collapsed hospital corridor.',
      },
      {
        stepNumber: 3,
        phase: 'High-Value Loot',
        instruction:
          'Descend into Metro Station Galleria to ambush rolling ARC Fireball units for Fireball Burners and crack Plaza Rosa hotel safes for Red Coral Jewelry.',
        targetPoi: 'Metro Station Galleria & Plaza Rosa',
        cautionNote:
          'Backpedal out of Fireball thermite pools immediately upon ignition.',
      },
      {
        stepNumber: 4,
        phase: 'Extraction',
        instruction:
          'Trigger the Subway Platform B extraction train and hold the ticket booth high ground until boarding.',
        targetPoi: 'Subway Platform B',
        cautionNote:
          'Check both tunnel mouths for late-arriving Raider squads drawn by the train horn.',
      },
    ],
  },
  'blue-gate': {
    mapSlug: 'blue-gate',
    mapName: 'Blue Gate',
    defaultTitle: 'Perimeter Trench Leaper Ambush & Customs Vault Breach',
    estimatedCoinYield: '10,200 – 15,000 Coins',
    baseExcitement: 89,
    expectedRewards: [
      'Leaper Pulse Unit',
      'Hornet Driver',
      'ARC Powercell',
      'Medium Shield',
    ],
    buildSteps: (condition, targetedMissingNames) => [
      {
        stepNumber: 1,
        phase: 'Insertion',
        instruction: `Slide into the Outer Perimeter Trench during ${condition.activeCondition} and secure tactical grenade crates at Checkpoint Alpha.`,
        targetPoi: 'Checkpoint Alpha',
        cautionNote:
          'Stay below the concrete parapet until the overhead Hornet patrol completes its north turn.',
      },
      {
        stepNumber: 2,
        phase: 'Primary Objective',
        instruction: `Use the Collapsed Overpass choke point to trap and destroy the Leaper Unit for ${
          targetedMissingNames.slice(0, 2).join(' and ') ||
          'Leaper Pulse Units & Hornet Drivers'
        }.`,
        targetPoi: 'Collapsed Overpass',
        cautionNote:
          'Coordinate reload windows behind the armored APC hull to avoid leap-crush damage.',
      },
      {
        stepNumber: 3,
        phase: 'High-Value Loot',
        instruction:
          'Loot the Transformer Yard conduits for ARC Powercells and open the Customs Vault heirloom chests.',
        targetPoi: 'Transformer Yard & Customs Vault',
        cautionNote:
          'Rollbots patrol the interior vault corridor—shoot them before they detonate at close range.',
      },
      {
        stepNumber: 4,
        phase: 'Extraction',
        instruction:
          'Extract via the Transit Tunnel Freight Lift along the eastern cliff wall.',
        targetPoi: 'Transit Tunnel Freight Lift',
        cautionNote:
          'Keep one Shield Recharger ready in case turret fire clips you on the ramp approach.',
      },
    ],
  },
  'stella-montis': {
    mapSlug: 'stella-montis',
    mapName: 'Stella Montis',
    defaultTitle: 'Observatory Ridge Relay & Bombardier Siege Harvest',
    estimatedCoinYield: '14,000 – 21,000 Coins',
    baseExcitement: 88,
    expectedRewards: [
      'Bombardier Cell',
      'Tellurion',
      'Radio Relay',
      'Electronic Components',
    ],
    buildSteps: (condition, targetedMissingNames) => [
      {
        stepNumber: 1,
        phase: 'Insertion',
        instruction: `Deploy at the Cable Car Terminal under ${condition.activeCondition} and advance up the sheltered service stairs toward Observatory Ridge.`,
        targetPoi: 'Cable Car Terminal',
        cautionNote:
          'Blizzard crosswinds limit audio range—scan ridgelines visually every 10 seconds.',
      },
      {
        stepNumber: 2,
        phase: 'Primary Objective',
        instruction: `Harvest Radio Relays and Electronic Components from Observatory Ridge consoles to fulfill ${
          targetedMissingNames.slice(0, 2).join(' and ') ||
          'Radio Relays & Bombardier Cells'
        }.`,
        targetPoi: 'Observatory Ridge',
        cautionNote:
          'Snitch Drones hover near the telescope dome; eliminate them from inside the doorway.',
      },
      {
        stepNumber: 3,
        phase: 'High-Value Loot',
        instruction:
          'Third-party or focus-fire the Glacier Depot Bombardier rear heat-vents for a Bombardier Cell and check the Deep Cryo Vault for Tellurion.',
        targetPoi: 'Glacier Depot & Deep Cryo Vault',
        cautionNote:
          'Never stay stationary for more than 2 seconds once the Bombardier mortar laser locks on.',
      },
      {
        stepNumber: 4,
        phase: 'Extraction',
        instruction:
          'Descend via the Alpine Garrison zipline and call the Gondola Extraction Pod.',
        targetPoi: 'Alpine Garrison Gondola',
        cautionNote:
          'Smoke the gondola platform before hitting the call terminal.',
      },
    ],
  },
};

export function buildTab2RaidPlan(
  player: PlayerProgressState,
  mapConditions?: LiveMapCondition[],
  missingItems?: MissingRequirementItem[]
): Tab2RaidPlan {
  const activeConditions =
    mapConditions && mapConditions.length > 0
      ? mapConditions
      : DEFAULT_LIVE_MAP_CONDITIONS;

  const resolvedMissingItems =
    missingItems ?? buildTab3InventorySmashPlan(player).missingRequiredItems;

  const primaryWeaponName =
    (player.loadout.primaryWeaponId &&
      ITEMS_BY_ID[player.loadout.primaryWeaponId]?.name) ||
    'Rattler I Assault Rifle';
  const secondaryWeaponName =
    (player.loadout.secondaryWeaponId &&
      ITEMS_BY_ID[player.loadout.secondaryWeaponId]?.name) ||
    'Anvil Hand Cannon';
  const shieldName =
    (player.loadout.shieldId && ITEMS_BY_ID[player.loadout.shieldId]?.name) ||
    'Medium Shield';
  const augmentName =
    (player.loadout.augmentId && ITEMS_BY_ID[player.loadout.augmentId]?.name) ||
    'Looter Augment Mk.2';

  const isLightOrMinimalKit =
    !player.loadout.primaryWeaponId ||
    player.loadout.shieldId === 'light_shield' ||
    !player.loadout.shieldId;

  const recommendedKitSummary = `${primaryWeaponName} + ${secondaryWeaponName} | ${shieldName} | ${augmentName} | Field Medkit + Shield Recharger + Smoke Grenade`;

  // Score each available map condition by how many missing items drop there
  const scoredMaps = activeConditions.map((cond) => {
    const matchingMissing = resolvedMissingItems.filter((item) =>
      item.bestPlacesToFind.some((loc) => loc.mapSlug === cond.mapSlug)
    );
    const template =
      MAP_ROUTE_TEMPLATES[cond.mapSlug] ??
      MAP_ROUTE_TEMPLATES['dam-battleground'];

    const missingScore = matchingMissing.reduce(
      (sum, item) => sum + item.missingQuantity * 3,
      0
    );

    const hazardPenalty =
      isLightOrMinimalKit && cond.hazardLevel === 'Extreme' ? 15 : 0;

    return {
      cond,
      template,
      matchingMissing,
      totalScore: template.baseExcitement + missingScore - hazardPenalty,
    };
  });

  scoredMaps.sort((a, b) => b.totalScore - a.totalScore);

  // Pick top 3 distinct raid ideas
  const selected = scoredMaps.slice(0, 3);
  while (selected.length < 3) {
    const fallbackCond =
      DEFAULT_LIVE_MAP_CONDITIONS[selected.length] ??
      DEFAULT_LIVE_MAP_CONDITIONS[0];
    const template =
      MAP_ROUTE_TEMPLATES[fallbackCond.mapSlug] ??
      MAP_ROUTE_TEMPLATES['dam-battleground'];
    selected.push({
      cond: fallbackCond,
      template,
      matchingMissing: resolvedMissingItems.slice(0, 3),
      totalScore: template.baseExcitement,
    });
  }

  const topRaidIdeas: RaidIdeaCard[] = selected.map((entry, idx) => {
    const rank = (idx + 1) as 1 | 2 | 3;
    const targetedMissingItems =
      entry.matchingMissing.length > 0
        ? entry.matchingMissing
            .slice(0, 4)
            .map((m) => `${m.itemName} (missing ${m.missingQuantity})`)
        : entry.template.expectedRewards.slice(0, 3);

    const targetedMissingPlainNames =
      entry.matchingMissing.length > 0
        ? entry.matchingMissing.map((m) => m.itemName)
        : entry.template.expectedRewards;

    const baseSteps = entry.template.buildSteps(
      entry.cond,
      targetedMissingPlainNames
    );
    const steps = isLightOrMinimalKit
      ? baseSteps.map((step) =>
          step.phase === 'High-Value Loot'
            ? {
                ...step,
                cautionNote: `${step.cautionNote} Stealth Route Active: Avoid direct Queen/Baron stronghold aggro with Light Shield; loot perimeter caches under smoke cover.`,
              }
            : step
        )
      : baseSteps;

    const loadoutFitLabel = isLightOrMinimalKit
      ? `Stealth-Adapted Route for ${primaryWeaponName} & ${shieldName}`
      : `100% Doable with Equipped ${primaryWeaponName} & ${shieldName}`;

    return {
      rank,
      mapSlug: entry.cond.mapSlug,
      mapName: entry.cond.mapName,
      raidTitle: entry.template.defaultTitle,
      activeCondition: entry.cond.activeCondition,
      doableWithCurrentLoadout: true,
      loadoutFitLabel,
      recommendedKitSummary,
      expectedRewards: entry.template.expectedRewards,
      targetedMissingItems,
      estimatedCoinYield: entry.template.estimatedCoinYield,
      excitementScore: Math.min(99, entry.template.baseExcitement - idx * 2),
      steps,
    };
  });

  const agentRouteCommentary = `Ranked Top 3 high-excitement raids around your equipped ${primaryWeaponName} + ${secondaryWeaponName} kit and live Speranza weather telemetry. #1 (${topRaidIdeas[0].mapName}) and #2 (${topRaidIdeas[1].mapName}) directly farm your highest-priority missing upgrade parts while keeping extraction risk manageable.`;

  return {
    liveMapConditions: activeConditions,
    topRaidIdeas,
    agentRouteCommentary,
  };
}
