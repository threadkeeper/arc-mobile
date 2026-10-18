import {
  CatalogItem,
  CraftingRecipe,
  HideoutLevelRequirement,
  LiveMapCondition,
  PlayerProgressState,
  ProjectStageSpec,
  QuestRequirementSpec,
} from '../shared/types';

export interface WeaponUpgradeRequirementSpec {
  id: string;
  weaponItemId: string;
  weaponName: string;
  tier: number;
  requiredItems: Array<{ itemId: string; quantity: number }>;
}

export const CATALOG_ITEMS: CatalogItem[] = [
  // ==========================================================================
  // WEAPONS
  // ==========================================================================
  {
    id: 'rattler_ar',
    name: 'Rattler I Assault Rifle',
    rarity: 'common',
    category: 'weapon',
    maxStack: 1,
    sellValueCoins: 950,
    iconUrl: '/icons/rattler_ar.svg',
    description:
      'Speranza workhorse full-auto assault rifle chambered in medium ammo. Reliable against Wasp swarms and hostile Raiders.',
    recycleYields: [
      { itemId: 'metal_parts', quantity: 4 },
      { itemId: 'rubber_parts', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Water Treatment Control', 'Hydroponic Dome Complex'],
        containerTypes: ['Weapon Crate', 'Security Locker'],
        arcSources: ['Sentinel Turret Wreckage'],
        dropRateHint: 'Common (35% in Weapon Crates)',
      },
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Plaza Rosa', 'Old Town Garrison'],
        containerTypes: ['Military Footlocker', 'Raider Stash'],
        arcSources: [],
        dropRateHint: 'Common (30% in Military Footlockers)',
      },
    ],
  },
  {
    id: 'anvil_hc',
    name: 'Anvil Hand Cannon',
    rarity: 'uncommon',
    category: 'weapon',
    maxStack: 1,
    sellValueCoins: 1350,
    iconUrl: '/icons/anvil_hc.svg',
    description:
      'High-impact heavy revolver capable of cracking ARC armor plating and staggering Hornets in two shots.',
    recycleYields: [
      { itemId: 'metal_parts', quantity: 5 },
      { itemId: 'arc_alloy', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Departure Building', 'Control Tower A6'],
        containerTypes: ['Officer Safe', 'Weapon Case'],
        arcSources: [],
        dropRateHint: 'Uncommon (22% in Weapon Cases)',
      },
      {
        mapSlug: 'blue-gate',
        mapName: 'Blue Gate',
        poiNames: ['Checkpoint Alpha', 'Customs Vault'],
        containerTypes: ['Armory Locker'],
        arcSources: [],
        dropRateHint: 'Uncommon (20% in Armory Lockers)',
      },
    ],
  },
  {
    id: 'il_toro_sg',
    name: 'Il Toro Shotgun',
    rarity: 'uncommon',
    category: 'weapon',
    maxStack: 1,
    sellValueCoins: 1400,
    iconUrl: '/icons/il_toro_sg.svg',
    description:
      'Semi-automatic close-quarters trench shotgun built for indoor bunker breaches and Tick infestations.',
    recycleYields: [
      { itemId: 'metal_parts', quantity: 5 },
      { itemId: 'rubber_parts', quantity: 3 },
    ],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Metro Station Galleria', 'Sunken Hospital'],
        containerTypes: ['Breach Locker', 'Weapon Crate'],
        arcSources: [],
        dropRateHint: 'Uncommon (24% in Metro Weapon Crates)',
      },
      {
        mapSlug: 'stella-montis',
        mapName: 'Stella Montis',
        poiNames: ['Cable Car Terminal', 'Alpine Garrison'],
        containerTypes: ['Security Armory Case'],
        arcSources: [],
        dropRateHint: 'Uncommon (18% in Security Cases)',
      },
    ],
  },
  {
    id: 'ferro_br',
    name: 'Ferro Battle Rifle',
    rarity: 'rare',
    category: 'weapon',
    maxStack: 1,
    sellValueCoins: 2100,
    iconUrl: '/icons/ferro_br.svg',
    description:
      'Precision heavy-caliber battle rifle engineered to punch through Leaper and Bastion weakpoints at long range.',
    recycleYields: [
      { itemId: 'metal_parts', quantity: 6 },
      { itemId: 'arc_alloy', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Rocket Assembly Hangar', 'Launch Pad Trench'],
        containerTypes: ['High-Security Weapon Vault'],
        arcSources: ['Bastion Guard Patrol'],
        dropRateHint: 'Rare (14% in High-Security Vaults)',
      },
      {
        mapSlug: 'stella-montis',
        mapName: 'Stella Montis',
        poiNames: ['Observatory Ridge', 'Cliffside Bunker'],
        containerTypes: ['Locked Military Cache'],
        arcSources: [],
        dropRateHint: 'Rare (12% in Military Caches)',
      },
    ],
  },

  // ==========================================================================
  // SHIELDS
  // ==========================================================================
  {
    id: 'light_shield',
    name: 'Light Shield',
    rarity: 'common',
    category: 'shield',
    maxStack: 1,
    sellValueCoins: 650,
    iconUrl: '/icons/light_shield.svg',
    description:
      'Standard two-bar kinetic barrier generator. Preserves full sprint mobility for fast loot runs.',
    recycleYields: [
      { itemId: 'arc_alloy', quantity: 1 },
      { itemId: 'electronic_components', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Research & Administration', 'Substation Outpost'],
        containerTypes: ['Tech Crate', 'Supply Bin'],
        arcSources: ['Wasp Scout'],
        dropRateHint: 'Common (32% in Tech Crates)',
      },
    ],
  },
  {
    id: 'medium_shield',
    name: 'Medium Shield',
    rarity: 'rare',
    category: 'shield',
    maxStack: 1,
    sellValueCoins: 1650,
    iconUrl: '/icons/medium_shield.svg',
    description:
      'Reinforced four-bar deflection harness tuned for sustained firefights against Hornets and rival squads.',
    recycleYields: [
      { itemId: 'arc_alloy', quantity: 2 },
      { itemId: 'electronic_components', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Fuel Depot', 'Radar Array'],
        containerTypes: ['Reinforced Tech Locker'],
        arcSources: ['Hornet Interceptor'],
        dropRateHint: 'Rare (16% in Reinforced Tech Lockers)',
      },
      {
        mapSlug: 'blue-gate',
        mapName: 'Blue Gate',
        poiNames: ['Command Spire', 'Transit Tunnel'],
        containerTypes: ['ARC Supply Pod'],
        arcSources: ['Leaper Unit'],
        dropRateHint: 'Rare (15% in ARC Supply Pods)',
      },
    ],
  },

  // ==========================================================================
  // AUGMENTS
  // ==========================================================================
  {
    id: 'combat_augment_mk1',
    name: 'Combat Augment Mk.1',
    rarity: 'uncommon',
    category: 'augment',
    maxStack: 1,
    sellValueCoins: 1100,
    iconUrl: '/icons/combat_augment_mk1.svg',
    description:
      'Rig augment expanding tactical quick-use slots and boosting shield recharge efficiency under fire.',
    recycleYields: [
      { itemId: 'electronic_components', quantity: 2 },
      { itemId: 'rubber_parts', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Power Generation Hall', 'Spillway Bunker'],
        containerTypes: ['Augment Case', 'Tech Locker'],
        arcSources: [],
        dropRateHint: 'Uncommon (20% in Augment Cases)',
      },
    ],
  },
  {
    id: 'looter_augment_mk2',
    name: 'Looter Augment Mk.2',
    rarity: 'rare',
    category: 'augment',
    maxStack: 1,
    sellValueCoins: 1950,
    iconUrl: '/icons/looter_augment_mk2.svg',
    description:
      'High-capacity exo-frame augment adding extra backpack slots and a reinforced safe-pocket compartment.',
    recycleYields: [
      { itemId: 'electronic_components', quantity: 3 },
      { itemId: 'durable_cloth', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Grand Library Vault', 'Commerce Center'],
        containerTypes: ['Locked Raider Cache', 'Tech Safe'],
        arcSources: [],
        dropRateHint: 'Rare (15% in Locked Raider Caches)',
      },
      {
        mapSlug: 'stella-montis',
        mapName: 'Stella Montis',
        poiNames: ['Research Annex', 'Summit Station'],
        containerTypes: ['Expedition Footlocker'],
        arcSources: [],
        dropRateHint: 'Rare (14% in Expedition Footlockers)',
      },
    ],
  },

  // ==========================================================================
  // AMMO
  // ==========================================================================
  {
    id: 'medium_ammo',
    name: 'Medium Ammo Stack',
    rarity: 'common',
    category: 'ammo',
    maxStack: 5,
    sellValueCoins: 180,
    iconUrl: '/icons/medium_ammo.svg',
    description:
      'Standard intermediate rifle cartridges compatible with Rattler I and assault platforms.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 1 }],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Water Treatment Control', 'Security Checkpoint'],
        containerTypes: ['Ammo Can', 'Patrol Pack'],
        arcSources: ['Wasp Scout'],
        dropRateHint: 'Very Common (65% in Ammo Cans)',
      },
    ],
  },
  {
    id: 'heavy_ammo',
    name: 'Heavy Ammo Stack',
    rarity: 'common',
    category: 'ammo',
    maxStack: 5,
    sellValueCoins: 240,
    iconUrl: '/icons/heavy_ammo.svg',
    description:
      'High-grain armor-piercing rounds for the Anvil Hand Cannon and Ferro Battle Rifle.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 2 }],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Security Barracks', 'Hangar Bay 3'],
        containerTypes: ['Ammo Can', 'Weapon Crate'],
        arcSources: ['Hornet Interceptor'],
        dropRateHint: 'Common (50% in Ammo Cans)',
      },
    ],
  },
  {
    id: 'shotgun_ammo',
    name: 'Shotgun Shells',
    rarity: 'common',
    category: 'ammo',
    maxStack: 5,
    sellValueCoins: 200,
    iconUrl: '/icons/shotgun_ammo.svg',
    description:
      '12-gauge tungsten buckshot loads tailored for the Il Toro Shotgun.',
    recycleYields: [
      { itemId: 'metal_parts', quantity: 1 },
      { itemId: 'rubber_parts', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Metro Station Galleria', 'Residential Quarter'],
        containerTypes: ['Ammo Box', 'Police Cruiser Trunk'],
        arcSources: [],
        dropRateHint: 'Common (55% in Ammo Boxes)',
      },
    ],
  },

  // ==========================================================================
  // HEALING & TACTICAL
  // ==========================================================================
  {
    id: 'antiseptic_kit',
    name: 'Field Medkit',
    rarity: 'uncommon',
    category: 'healing',
    maxStack: 3,
    sellValueCoins: 420,
    iconUrl: '/icons/antiseptic_kit.svg',
    description:
      'Sterile trauma dressing and bio-foam injector that rapidly restores Raider vitality after heavy engagements.',
    recycleYields: [
      { itemId: 'antiseptic', quantity: 1 },
      { itemId: 'durable_cloth', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Sunken Hospital', 'Pharmacy Row'],
        containerTypes: ['Medical Cabinet', 'Ambulance Stretcher Box'],
        arcSources: [],
        dropRateHint: 'Common (42% in Medical Cabinets)',
      },
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Hydroponic Dome Complex', 'Triage Tent'],
        containerTypes: ['First Aid Case'],
        arcSources: [],
        dropRateHint: 'Common (35% in First Aid Cases)',
      },
    ],
  },
  {
    id: 'shield_recharger',
    name: 'Shield Recharger',
    rarity: 'uncommon',
    category: 'healing',
    maxStack: 3,
    sellValueCoins: 460,
    iconUrl: '/icons/shield_recharger.svg',
    description:
      'Portable capacitor cell that surges power directly into depleted Light or Medium Shields.',
    recycleYields: [
      { itemId: 'arc_powercell', quantity: 1 },
      { itemId: 'rubber_parts', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Power Substation', 'Departure Building'],
        containerTypes: ['Utility Locker', 'Tech Crate'],
        arcSources: ['Wasp Scout', 'Hornet Interceptor'],
        dropRateHint: 'Common (38% from ARC Flyers)',
      },
    ],
  },
  {
    id: 'smoke_grenade',
    name: 'Smoke Grenade',
    rarity: 'common',
    category: 'tactical',
    maxStack: 3,
    sellValueCoins: 260,
    iconUrl: '/icons/smoke_grenade.svg',
    description:
      'Thermal-masking aerosol canister that breaks ARC optical lock-ons and covers extraction elevator calls.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 1 }],
    dropLocations: [
      {
        mapSlug: 'blue-gate',
        mapName: 'Blue Gate',
        poiNames: ['Checkpoint Alpha', 'Border Watchtower'],
        containerTypes: ['Tactical Pouch', 'Grenade Crate'],
        arcSources: [],
        dropRateHint: 'Common (40% in Grenade Crates)',
      },
    ],
  },

  // ==========================================================================
  // MATERIALS
  // ==========================================================================
  {
    id: 'arc_alloy',
    name: 'ARC Alloy',
    rarity: 'uncommon',
    category: 'material',
    maxStack: 20,
    sellValueCoins: 320,
    iconUrl: '/icons/arc_alloy.svg',
    description:
      'High-density memory metal stripped from downed ARC chassis. Essential for hideout stations and armor smithing.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 2 }],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Water Treatment Control', 'Generator Courtyard'],
        containerTypes: ['ARC Wreckage Husk'],
        arcSources: ['Wasp Scout', 'Hornet Interceptor', 'Leaper Unit'],
        dropRateHint: 'High (75% from all ARC machines)',
      },
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Launch Pad Trench', 'Runway Scrapyard'],
        containerTypes: ['ARC Salvage Pile'],
        arcSources: ['Bastion', 'Hornet Interceptor'],
        dropRateHint: 'High (80% in Runway Scrapyard)',
      },
    ],
  },
  {
    id: 'arc_powercell',
    name: 'ARC Powercell',
    rarity: 'uncommon',
    category: 'material',
    maxStack: 15,
    sellValueCoins: 350,
    iconUrl: '/icons/arc_powercell.svg',
    description:
      'Volatile energy core harvested from active ARC drones. Powers shield rechargers and orbital comms relays.',
    recycleYields: [{ itemId: 'electronic_components', quantity: 1 }],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Fuel Depot', 'Power Substation', 'Radar Array'],
        containerTypes: ['Battery Rack', 'ARC Drone Chassis'],
        arcSources: ['Wasp Scout', 'Hornet Interceptor', 'Snitch Drone'],
        dropRateHint: 'High (65% from Wasp and Hornet kills)',
      },
      {
        mapSlug: 'blue-gate',
        mapName: 'Blue Gate',
        poiNames: ['Transformer Yard', 'Command Spire'],
        containerTypes: ['Generator Conduit'],
        arcSources: ['Rollbot', 'Wasp Scout'],
        dropRateHint: 'Common (55% in Transformer Yard)',
      },
    ],
  },
  {
    id: 'durable_cloth',
    name: 'Durable Cloth',
    rarity: 'common',
    category: 'material',
    maxStack: 20,
    sellValueCoins: 190,
    iconUrl: '/icons/durable_cloth.svg',
    description:
      'Ripstop ballistic weave used in medical trauma wraps, rig harnesses, and hideout upholstery.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Plaza Rosa', 'Residential Quarter', 'Sunken Hospital'],
        containerTypes: ['Suitcase', 'Wardrobe', 'Medical Supply Bin'],
        arcSources: [],
        dropRateHint: 'High (60% in Residential Suitcases)',
      },
    ],
  },
  {
    id: 'antiseptic',
    name: 'Antiseptic',
    rarity: 'uncommon',
    category: 'material',
    maxStack: 15,
    sellValueCoins: 310,
    iconUrl: '/icons/antiseptic.svg',
    description:
      'Pharmaceutical-grade disinfectant bottle required for Medical Station upgrades and Field Medkit synthesis.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Sunken Hospital', 'Pharmacy Row'],
        containerTypes: ['Medical Cabinet', 'Lab Refrigerator'],
        arcSources: [],
        dropRateHint: 'High (50% in Sunken Hospital Medical Cabinets)',
      },
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Hydroponic Dome Complex', 'Research & Administration'],
        containerTypes: ['Med Bag', 'Bio-Lab Locker'],
        arcSources: [],
        dropRateHint: 'Moderate (35% in Hydroponic Dome Med Bags)',
      },
    ],
  },
  {
    id: 'metal_parts',
    name: 'Metal Parts',
    rarity: 'common',
    category: 'material',
    maxStack: 30,
    sellValueCoins: 90,
    iconUrl: '/icons/metal_parts.svg',
    description:
      'Milled fasteners, springs, and stamped steel plates used across almost every Gunsmith and Refiner recipe.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Power Generation Hall', 'Maintenance Tunnels'],
        containerTypes: ['Toolbox', 'Industrial Shelf'],
        arcSources: ['Tick', 'Wasp Scout'],
        dropRateHint: 'Very High (80% in Toolboxes)',
      },
    ],
  },
  {
    id: 'rubber_parts',
    name: 'Rubber Parts',
    rarity: 'common',
    category: 'material',
    maxStack: 30,
    sellValueCoins: 95,
    iconUrl: '/icons/rubber_parts.svg',
    description:
      'Vulcanized gaskets and insulated hoses essential for recoil buffers, augments, and sealants.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Water Treatment Control', 'Pump Station'],
        containerTypes: ['Utility Bin', 'Toolbox'],
        arcSources: [],
        dropRateHint: 'Very High (75% in Pump Station Bins)',
      },
    ],
  },
  {
    id: 'electronic_components',
    name: 'Electronic Components',
    rarity: 'uncommon',
    category: 'material',
    maxStack: 20,
    sellValueCoins: 260,
    iconUrl: '/icons/electronic_components.svg',
    description:
      'Intact printed circuit boards, relays, and micro-capacitors used for shields, augments, and Tech Bench upgrades.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 1 }],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Control Tower A6', 'Radar Array'],
        containerTypes: ['Server Rack', 'Tech Drawer'],
        arcSources: ['Snitch Drone'],
        dropRateHint: 'High (60% in Control Tower Server Racks)',
      },
      {
        mapSlug: 'stella-montis',
        mapName: 'Stella Montis',
        poiNames: ['Observatory Ridge', 'Weather Station'],
        containerTypes: ['Instrument Console'],
        arcSources: [],
        dropRateHint: 'High (55% in Observatory Consoles)',
      },
    ],
  },

  // ==========================================================================
  // RARE ARC PARTS & CRITICAL UPGRADE ITEMS
  // ==========================================================================
  {
    id: 'leaper_pulse_unit',
    name: 'Leaper Pulse Unit',
    rarity: 'epic',
    category: 'arc_part',
    maxStack: 5,
    sellValueCoins: 2800,
    iconUrl: '/icons/leaper_pulse_unit.svg',
    description:
      'Repulsion jump-drive core extracted from an ambush Leaper. Critical for high-tier Tech Bench and Expedition systems.',
    recycleYields: [
      { itemId: 'arc_alloy', quantity: 4 },
      { itemId: 'electronic_components', quantity: 3 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Red Lakes Basin', 'Spillway Gorge'],
        containerTypes: ['Leaper Core Wreckage'],
        arcSources: ['Leaper Unit'],
        dropRateHint: 'Guaranteed / High (65% from Leaper kills in Red Lakes)',
      },
      {
        mapSlug: 'blue-gate',
        mapName: 'Blue Gate',
        poiNames: ['Outer Perimeter Trench', 'Collapsed Overpass'],
        containerTypes: ['Leaper Core Wreckage'],
        arcSources: ['Leaper Unit'],
        dropRateHint: 'High (60% from Leaper patrols)',
      },
    ],
  },
  {
    id: 'wasp_driver',
    name: 'Wasp Driver',
    rarity: 'rare',
    category: 'arc_part',
    maxStack: 10,
    sellValueCoins: 980,
    iconUrl: '/icons/wasp_driver.svg',
    description:
      'Stabilized rotor-thruster actuator salvaged from ARC Wasp scouts. Required for Gunsmith calibrations and quests.',
    recycleYields: [
      { itemId: 'arc_alloy', quantity: 2 },
      { itemId: 'metal_parts', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Water Treatment Control', 'Research & Administration'],
        containerTypes: ['Downed Wasp Husk'],
        arcSources: ['Wasp Scout'],
        dropRateHint: 'Moderate (40% from Wasp Scouts)',
      },
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Plaza Rosa', 'Bell Tower Square'],
        containerTypes: ['Downed Wasp Husk'],
        arcSources: ['Wasp Scout'],
        dropRateHint: 'Moderate (40% from aerial patrols)',
      },
    ],
  },
  {
    id: 'hornet_driver',
    name: 'Hornet Driver',
    rarity: 'rare',
    category: 'arc_part',
    maxStack: 10,
    sellValueCoins: 1250,
    iconUrl: '/icons/hornet_driver.svg',
    description:
      'Armored twin-vector thruster module from an ARC Hornet gunship. Essential for Gear Bench and telemetry quests.',
    recycleYields: [
      { itemId: 'arc_alloy', quantity: 3 },
      { itemId: 'electronic_components', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Launch Pad Trench', 'Fuel Depot', 'Control Tower A6'],
        containerTypes: ['Hornet Salvage Core'],
        arcSources: ['Hornet Interceptor'],
        dropRateHint: 'Moderate (45% from Hornet Interceptors)',
      },
      {
        mapSlug: 'blue-gate',
        mapName: 'Blue Gate',
        poiNames: ['Checkpoint Alpha', 'Command Spire'],
        containerTypes: ['Hornet Salvage Core'],
        arcSources: ['Hornet Interceptor'],
        dropRateHint: 'Moderate (42% from Hornet squads)',
      },
    ],
  },
  {
    id: 'bombardier_cell',
    name: 'Bombardier Cell',
    rarity: 'epic',
    category: 'arc_part',
    maxStack: 5,
    sellValueCoins: 3400,
    iconUrl: '/icons/bombardier_cell.svg',
    description:
      'Superheated mortar-capacitor cell pulled from an ARC Bombardier siege unit. Highly sought after for heavy upgrades.',
    recycleYields: [
      { itemId: 'arc_powercell', quantity: 4 },
      { itemId: 'arc_alloy', quantity: 4 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Rocket Assembly Hangar', 'Central Apron'],
        containerTypes: ['Bombardier Siege Wreckage'],
        arcSources: ['Bombardier'],
        dropRateHint: 'Rare (55% from Bombardier boss encounters)',
      },
      {
        mapSlug: 'stella-montis',
        mapName: 'Stella Montis',
        poiNames: ['Glacier Depot', 'Alpine Garrison'],
        containerTypes: ['Bombardier Siege Wreckage'],
        arcSources: ['Bombardier'],
        dropRateHint: 'Rare (50% during Heavy Ordinance events)',
      },
    ],
  },
  {
    id: 'snitch_scanner',
    name: 'Snitch Scanner',
    rarity: 'rare',
    category: 'arc_part',
    maxStack: 10,
    sellValueCoins: 1150,
    iconUrl: '/icons/snitch_scanner.svg',
    description:
      'Multi-spectrum LiDAR and uplink array taken from a destroyed ARC Snitch recon drone before it can summon reinforcements.',
    recycleYields: [
      { itemId: 'electronic_components', quantity: 3 },
      { itemId: 'arc_powercell', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Research & Administration', 'Hydroponic Dome Complex'],
        containerTypes: ['Snitch Recon Pod'],
        arcSources: ['Snitch Drone'],
        dropRateHint: 'High (60% if destroyed before uplink completes)',
      },
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Radar Array', 'Perimeter Fence'],
        containerTypes: ['Snitch Recon Pod'],
        arcSources: ['Snitch Drone'],
        dropRateHint: 'High (60% from roaming Snitch Drones)',
      },
    ],
  },
  {
    id: 'tellurion',
    name: 'Tellurion',
    rarity: 'legendary',
    category: 'arc_part',
    maxStack: 5,
    sellValueCoins: 5200,
    iconUrl: '/icons/tellurion.svg',
    description:
      'Exotic orbital hyper-conductor recovered only from apex ARC command cores and Baron husks. Never recycle or sell.',
    recycleYields: [
      { itemId: 'arc_alloy', quantity: 6 },
      { itemId: 'arc_powercell', quantity: 4 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Rocket Assembly Hangar', 'Orbital Telemetry Vault'],
        containerTypes: ['Apex ARC Core', 'Baron Husk'],
        arcSources: ['Queen', 'Baron Husk', 'Harvester'],
        dropRateHint: 'Legendary (25% in Harvester & Orbital Vaults)',
      },
      {
        mapSlug: 'stella-montis',
        mapName: 'Stella Montis',
        poiNames: ['Summit Citadel', 'Deep Cryo Vault'],
        containerTypes: ['Classified ARC Reliquary'],
        arcSources: ['Queen', 'Bastion Elite'],
        dropRateHint: 'Legendary (20% in Classified Reliquaries)',
      },
    ],
  },
  {
    id: 'radio_relay',
    name: 'Radio Relay',
    rarity: 'rare',
    category: 'arc_part',
    maxStack: 10,
    sellValueCoins: 1050,
    iconUrl: '/icons/radio_relay.svg',
    description:
      'Encrypted burst-transceiver module used to link Speranza recon teams and upgrade Tech Bench comms.',
    recycleYields: [
      { itemId: 'electronic_components', quantity: 2 },
      { itemId: 'metal_parts', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Control Tower A6', 'Radar Array'],
        containerTypes: ['Comms Rack', 'Signal Technician Locker'],
        arcSources: ['Snitch Drone'],
        dropRateHint: 'Moderate (35% in Control Tower Comms Racks)',
      },
      {
        mapSlug: 'stella-montis',
        mapName: 'Stella Montis',
        poiNames: ['Observatory Ridge', 'Relay Tower North'],
        containerTypes: ['Transmission Box'],
        arcSources: [],
        dropRateHint: 'Moderate (40% in Relay Tower Boxes)',
      },
    ],
  },
  {
    id: 'fireball_burner',
    name: 'Fireball Burner',
    rarity: 'rare',
    category: 'arc_part',
    maxStack: 10,
    sellValueCoins: 1180,
    iconUrl: '/icons/fireball_burner.svg',
    description:
      'Pressurized thermite ignition manifold salvaged from rolling ARC Fireball units. Required for Refiner and weapon upgrades.',
    recycleYields: [
      { itemId: 'arc_alloy', quantity: 2 },
      { itemId: 'rubber_parts', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Metro Station Galleria', 'Underground Boiler Room'],
        containerTypes: ['Fireball Chassis'],
        arcSources: ['Fireball'],
        dropRateHint: 'High (50% from Fireball kills in Metro tunnels)',
      },
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Power Generation Hall', 'Turbine Sub-level'],
        containerTypes: ['Fireball Chassis'],
        arcSources: ['Fireball'],
        dropRateHint: 'Moderate (45% in Turbine Sub-level)',
      },
    ],
  },

  // ==========================================================================
  // SCRAP / RECYCLE CANDIDATES (NON-CRITICAL SALVAGE)
  // ==========================================================================
  {
    id: 'damaged_optics',
    name: 'Damaged Optics',
    rarity: 'common',
    category: 'material',
    maxStack: 10,
    sellValueCoins: 140,
    iconUrl: '/icons/damaged_optics.svg',
    description:
      'Cracked targeting lenses from obsolete rangefinders. No future upgrade value once initial calibration quests are finished; prime for recycling into electronics.',
    recycleYields: [
      { itemId: 'electronic_components', quantity: 2 },
      { itemId: 'metal_parts', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Research & Administration', 'Watchtower South'],
        containerTypes: ['Scrap Bin', 'Desk Drawer'],
        arcSources: ['Wasp Scout'],
        dropRateHint: 'Common (50% in Research Desk Drawers)',
      },
    ],
  },
  {
    id: 'frayed_wiring',
    name: 'Frayed Wiring',
    rarity: 'common',
    category: 'material',
    maxStack: 15,
    sellValueCoins: 110,
    iconUrl: '/icons/frayed_wiring.svg',
    description:
      'Tangled copper looms and scorched insulation. Best recycled or refined into clean Electronic Components and Rubber Parts.',
    recycleYields: [
      { itemId: 'electronic_components', quantity: 1 },
      { itemId: 'rubber_parts', quantity: 2 },
    ],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Metro Station Galleria', 'Abandoned Substation'],
        containerTypes: ['Fuse Box', 'Cable Spool'],
        arcSources: ['Tick'],
        dropRateHint: 'Very Common (65% in Fuse Boxes)',
      },
    ],
  },
  {
    id: 'rusted_gear_casing',
    name: 'Rusted Gear Casing',
    rarity: 'common',
    category: 'material',
    maxStack: 10,
    sellValueCoins: 125,
    iconUrl: '/icons/rusted_gear_casing.svg',
    description:
      'Corroded mechanical housing from pre-collapse machinery. Smelt or recycle for abundant Metal Parts and Rubber Parts.',
    recycleYields: [
      { itemId: 'metal_parts', quantity: 3 },
      { itemId: 'rubber_parts', quantity: 1 },
    ],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Water Treatment Control', 'Turbine Sub-level'],
        containerTypes: ['Machinery Crate', 'Industrial Locker'],
        arcSources: [],
        dropRateHint: 'Very Common (70% in Machinery Crates)',
      },
    ],
  },

  // ==========================================================================
  // VENDOR TRINKETS (HIGH COIN VALUE, SELL IMMEDIATELY AFTER PAST QUESTS)
  // ==========================================================================
  {
    id: 'bronze_statuette',
    name: 'Bronze Statuette',
    rarity: 'rare',
    category: 'trinket',
    maxStack: 3,
    sellValueCoins: 1800,
    iconUrl: '/icons/bronze_statuette.svg',
    description:
      'Pre-collapse classical sculpture prized by Speranza collectors. Sell immediately for 1,800 Raider Coins once early relic quests are complete.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 2 }],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Grand Library Vault', 'Mayor Residence'],
        containerTypes: ['Display Case', 'Ornamental Safe'],
        arcSources: [],
        dropRateHint: 'Rare (20% in Mayor Residence Display Cases)',
      },
    ],
  },
  {
    id: 'fine_wristwatch',
    name: 'Fine Wristwatch',
    rarity: 'rare',
    category: 'trinket',
    maxStack: 3,
    sellValueCoins: 2400,
    iconUrl: '/icons/fine_wristwatch.svg',
    description:
      'Precision mechanical chronograph with gold bezel. Pure vendor trade good worth 2,400 Raider Coins.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 1 }],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['VIP Lounge', 'Departure Building'],
        containerTypes: ['Executive Briefcase', 'Wall Safe'],
        arcSources: [],
        dropRateHint: 'Rare (18% in VIP Lounge Briefcases)',
      },
    ],
  },
  {
    id: 'red_coral_jewelry',
    name: 'Red Coral Jewelry',
    rarity: 'epic',
    category: 'trinket',
    maxStack: 3,
    sellValueCoins: 3200,
    iconUrl: '/icons/red_coral_jewelry.svg',
    description:
      'Artisanal Mediterranean coral necklace from the Old World. Fetches 3,200 Raider Coins from Speranza merchants.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Plaza Rosa', 'Boutique Vault'],
        containerTypes: ['Jewelry Box', 'Hotel Safe'],
        arcSources: [],
        dropRateHint: 'Epic (12% in Plaza Rosa Safes)',
      },
    ],
  },
  {
    id: 'music_box',
    name: 'Vintage Music Box',
    rarity: 'uncommon',
    category: 'trinket',
    maxStack: 3,
    sellValueCoins: 1500,
    iconUrl: '/icons/music_box.svg',
    description:
      'Hand-wound chime box that still plays a haunting melody. Worth 1,500 Raider Coins to traders once past relic requests are done.',
    recycleYields: [{ itemId: 'metal_parts', quantity: 1 }],
    dropLocations: [
      {
        mapSlug: 'blue-gate',
        mapName: 'Blue Gate',
        poiNames: ['Customs Vault', 'Abandoned Villa'],
        containerTypes: ['Heirloom Chest', 'Nightstand'],
        arcSources: [],
        dropRateHint: 'Uncommon (25% in Abandoned Villa)',
      },
    ],
  },

  // ==========================================================================
  // KEYS (HIGH-SECURITY VAULT & ROOM ACCESS)
  // ==========================================================================
  {
    id: 'dam_surveillance_key',
    name: 'Dam Surveillance Room Key',
    rarity: 'rare',
    category: 'key',
    maxStack: 1,
    sellValueCoins: 1600,
    iconUrl: '/icons/dam_surveillance_key.svg',
    description:
      'Coded magnetic keycard granting entry to the locked Surveillance Office in Dam Battleground Research & Administration.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'dam-battleground',
        mapName: 'Dam Battleground',
        poiNames: ['Research & Administration', 'Water Treatment Control'],
        containerTypes: ['Jacket Pocket', 'Filing Cabinet', 'Security Desk'],
        arcSources: [],
        dropRateHint: 'Rare (12% in Research Filing Cabinets)',
      },
    ],
  },
  {
    id: 'spaceport_control_tower_key',
    name: 'Spaceport Control Tower A6 Key',
    rarity: 'epic',
    category: 'key',
    maxStack: 1,
    sellValueCoins: 2900,
    iconUrl: '/icons/spaceport_control_tower_key.svg',
    description:
      'High-clearance flight director keycard unlocking the upper telemetry armory in Spaceport Control Tower A6.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'the-spaceport',
        mapName: 'The Spaceport',
        poiNames: ['Departure Building', 'Control Tower A6'],
        containerTypes: ['Officer Safe', 'Flight Director Desk'],
        arcSources: [],
        dropRateHint: 'Epic (8% in Departure Officer Safes)',
      },
    ],
  },
  {
    id: 'buried_city_hospital_key',
    name: 'Sunken Hospital Pharmacy Key',
    rarity: 'rare',
    category: 'key',
    maxStack: 1,
    sellValueCoins: 1750,
    iconUrl: '/icons/buried_city_hospital_key.svg',
    description:
      'Brass master key to the reinforced narcotics and trauma vault inside Buried City Sunken Hospital.',
    recycleYields: [],
    dropLocations: [
      {
        mapSlug: 'buried-city',
        mapName: 'Buried City',
        poiNames: ['Sunken Hospital', 'Mayor Residence'],
        containerTypes: ['Doctor Coat', 'Medical Desk Drawer'],
        arcSources: [],
        dropRateHint: 'Rare (14% in Sunken Hospital Desks)',
      },
    ],
  },
];

export const ITEMS_BY_ID: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG_ITEMS.map((item) => [item.id, item])
);

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Refining salvage scrap into core crafting materials
  {
    id: 'refine_rusted_gear_casing',
    outputItemId: 'metal_parts',
    outputQuantity: 4,
    actionType: 'refine',
    stationId: 'refiner',
    stationName: 'Refiner',
    requiredStationLevel: 1,
    ingredients: [{ itemId: 'rusted_gear_casing', quantity: 1 }],
  },
  {
    id: 'refine_damaged_optics',
    outputItemId: 'electronic_components',
    outputQuantity: 2,
    actionType: 'refine',
    stationId: 'refiner',
    stationName: 'Refiner',
    requiredStationLevel: 1,
    ingredients: [{ itemId: 'damaged_optics', quantity: 1 }],
  },
  {
    id: 'refine_frayed_wiring',
    outputItemId: 'rubber_parts',
    outputQuantity: 2,
    actionType: 'refine',
    stationId: 'refiner',
    stationName: 'Refiner',
    requiredStationLevel: 1,
    ingredients: [{ itemId: 'frayed_wiring', quantity: 1 }],
  },

  // Crafting 5-raid loadout essentials
  {
    id: 'craft_rattler_ar',
    outputItemId: 'rattler_ar',
    outputQuantity: 1,
    actionType: 'craft',
    stationId: 'gunsmith',
    stationName: 'Gunsmith',
    requiredStationLevel: 1,
    ingredients: [
      { itemId: 'metal_parts', quantity: 6 },
      { itemId: 'rubber_parts', quantity: 3 },
    ],
  },
  {
    id: 'craft_anvil_hc',
    outputItemId: 'anvil_hc',
    outputQuantity: 1,
    actionType: 'craft',
    stationId: 'gunsmith',
    stationName: 'Gunsmith',
    requiredStationLevel: 1,
    ingredients: [
      { itemId: 'metal_parts', quantity: 5 },
      { itemId: 'rubber_parts', quantity: 2 },
    ],
  },
  {
    id: 'craft_light_shield',
    outputItemId: 'light_shield',
    outputQuantity: 1,
    actionType: 'craft',
    stationId: 'gear_bench',
    stationName: 'Gear Bench',
    requiredStationLevel: 1,
    ingredients: [
      { itemId: 'electronic_components', quantity: 2 },
      { itemId: 'metal_parts', quantity: 3 },
    ],
  },
  {
    id: 'craft_medium_shield',
    outputItemId: 'medium_shield',
    outputQuantity: 1,
    actionType: 'craft',
    stationId: 'gear_bench',
    stationName: 'Gear Bench',
    requiredStationLevel: 2,
    ingredients: [
      { itemId: 'arc_alloy', quantity: 3 },
      { itemId: 'electronic_components', quantity: 3 },
    ],
  },
  {
    id: 'craft_combat_augment_mk1',
    outputItemId: 'combat_augment_mk1',
    outputQuantity: 1,
    actionType: 'craft',
    stationId: 'tech_bench',
    stationName: 'Tech Bench',
    requiredStationLevel: 1,
    ingredients: [
      { itemId: 'electronic_components', quantity: 2 },
      { itemId: 'rubber_parts', quantity: 3 },
    ],
  },
  {
    id: 'craft_antiseptic_kit',
    outputItemId: 'antiseptic_kit',
    outputQuantity: 1,
    actionType: 'craft',
    stationId: 'medical_station',
    stationName: 'Medical Station',
    requiredStationLevel: 1,
    ingredients: [
      { itemId: 'durable_cloth', quantity: 1 },
      { itemId: 'antiseptic', quantity: 1 },
    ],
  },
  {
    id: 'craft_shield_recharger',
    outputItemId: 'shield_recharger',
    outputQuantity: 1,
    actionType: 'craft',
    stationId: 'tech_bench',
    stationName: 'Tech Bench',
    requiredStationLevel: 1,
    ingredients: [
      { itemId: 'electronic_components', quantity: 1 },
      { itemId: 'rubber_parts', quantity: 2 },
    ],
  },
  {
    id: 'craft_medium_ammo',
    outputItemId: 'medium_ammo',
    outputQuantity: 2,
    actionType: 'craft',
    stationId: 'gunsmith',
    stationName: 'Gunsmith',
    requiredStationLevel: 1,
    ingredients: [{ itemId: 'metal_parts', quantity: 2 }],
  },
];

export const HIDEOUT_REQUIREMENTS: HideoutLevelRequirement[] = [
  // GUNSMITH (Player is Level 2 -> Levels 1 & 2 are past, Level 3 is future)
  {
    stationId: 'gunsmith',
    stationName: 'Gunsmith',
    level: 1,
    requiredItems: [
      { itemId: 'metal_parts', quantity: 10 },
      { itemId: 'rubber_parts', quantity: 6 },
    ],
  },
  {
    stationId: 'gunsmith',
    stationName: 'Gunsmith',
    level: 2,
    requiredItems: [
      { itemId: 'arc_alloy', quantity: 6 },
      { itemId: 'rusted_gear_casing', quantity: 3 },
    ],
  },
  {
    stationId: 'gunsmith',
    stationName: 'Gunsmith',
    level: 3,
    requiredItems: [
      { itemId: 'wasp_driver', quantity: 3 },
      { itemId: 'fireball_burner', quantity: 2 },
      { itemId: 'arc_alloy', quantity: 8 },
    ],
  },

  // MEDICAL STATION (Player is Level 1 -> Level 1 is past, Levels 2 & 3 are future)
  {
    stationId: 'medical_station',
    stationName: 'Medical Station',
    level: 1,
    requiredItems: [{ itemId: 'durable_cloth', quantity: 5 }],
  },
  {
    stationId: 'medical_station',
    stationName: 'Medical Station',
    level: 2,
    requiredItems: [
      { itemId: 'antiseptic', quantity: 4 },
      { itemId: 'durable_cloth', quantity: 6 },
    ],
  },
  {
    stationId: 'medical_station',
    stationName: 'Medical Station',
    level: 3,
    requiredItems: [
      { itemId: 'antiseptic', quantity: 6 },
      { itemId: 'leaper_pulse_unit', quantity: 1 },
    ],
  },

  // GEAR BENCH (Player is Level 2 -> Levels 1 & 2 are past, Level 3 is future)
  {
    stationId: 'gear_bench',
    stationName: 'Gear Bench',
    level: 1,
    requiredItems: [
      { itemId: 'rubber_parts', quantity: 8 },
      { itemId: 'durable_cloth', quantity: 4 },
    ],
  },
  {
    stationId: 'gear_bench',
    stationName: 'Gear Bench',
    level: 2,
    requiredItems: [
      { itemId: 'arc_alloy', quantity: 6 },
      { itemId: 'electronic_components', quantity: 4 },
    ],
  },
  {
    stationId: 'gear_bench',
    stationName: 'Gear Bench',
    level: 3,
    requiredItems: [
      { itemId: 'hornet_driver', quantity: 3 },
      { itemId: 'bombardier_cell', quantity: 1 },
      { itemId: 'arc_alloy', quantity: 6 },
    ],
  },

  // TECH BENCH (Player is Level 1 -> Level 1 is past, Levels 2 & 3 are future)
  {
    stationId: 'tech_bench',
    stationName: 'Tech Bench',
    level: 1,
    requiredItems: [
      { itemId: 'electronic_components', quantity: 4 },
      { itemId: 'frayed_wiring', quantity: 3 },
    ],
  },
  {
    stationId: 'tech_bench',
    stationName: 'Tech Bench',
    level: 2,
    requiredItems: [
      { itemId: 'snitch_scanner', quantity: 2 },
      { itemId: 'radio_relay', quantity: 2 },
      { itemId: 'arc_powercell', quantity: 4 },
    ],
  },
  {
    stationId: 'tech_bench',
    stationName: 'Tech Bench',
    level: 3,
    requiredItems: [
      { itemId: 'leaper_pulse_unit', quantity: 2 },
      { itemId: 'tellurion', quantity: 1 },
    ],
  },

  // REFINER (Player is Level 2 -> Levels 1 & 2 are past, Level 3 is future)
  {
    stationId: 'refiner',
    stationName: 'Refiner',
    level: 1,
    requiredItems: [
      { itemId: 'metal_parts', quantity: 12 },
      { itemId: 'rusted_gear_casing', quantity: 2 },
    ],
  },
  {
    stationId: 'refiner',
    stationName: 'Refiner',
    level: 2,
    requiredItems: [
      { itemId: 'arc_alloy', quantity: 5 },
      { itemId: 'damaged_optics', quantity: 2 },
    ],
  },
  {
    stationId: 'refiner',
    stationName: 'Refiner',
    level: 3,
    requiredItems: [
      { itemId: 'fireball_burner', quantity: 3 },
      { itemId: 'bombardier_cell', quantity: 1 },
    ],
  },
];

export const QUEST_REQUIREMENTS: QuestRequirementSpec[] = [
  // COMPLETED QUESTS (3 completed -> status: 'past')
  {
    questId: 'quest_clear_water_treatment',
    questName: 'Clear Water Treatment',
    traderName: 'Celeste',
    mapName: 'Dam Battleground',
    requiredItems: [
      { itemId: 'metal_parts', quantity: 8 },
      { itemId: 'rusted_gear_casing', quantity: 2 },
    ],
    rewardSummary: '1,500 XP + Rattler I Blueprint',
  },
  {
    questId: 'quest_relics_of_old_world',
    questName: 'Relics of the Old World',
    traderName: 'Lance',
    mapName: 'Buried City',
    requiredItems: [
      { itemId: 'bronze_statuette', quantity: 1 },
      { itemId: 'music_box', quantity: 1 },
    ],
    rewardSummary: '2,200 XP + 3,500 Raider Coins',
  },
  {
    questId: 'quest_salvage_field_optics',
    questName: 'Salvage Field Optics',
    traderName: 'Shani',
    mapName: 'Dam Battleground',
    requiredItems: [
      { itemId: 'damaged_optics', quantity: 2 },
      { itemId: 'frayed_wiring', quantity: 2 },
    ],
    rewardSummary: '1,800 XP + Combat Augment Mk.1',
  },

  // ACTIVE / FUTURE QUESTS (4 active/future -> status: 'future')
  {
    questId: 'quest_wasp_menace',
    questName: 'Grounded Swarm',
    traderName: 'Shani',
    mapName: 'Dam Battleground',
    requiredItems: [
      { itemId: 'wasp_driver', quantity: 3 },
      { itemId: 'snitch_scanner', quantity: 2 },
    ],
    rewardSummary: '3,400 XP + Medium Shield + 2,500 Coins',
  },
  {
    questId: 'quest_hornet_telemetry',
    questName: 'Skyline Interception',
    traderName: 'Tian Wen',
    mapName: 'The Spaceport',
    requiredItems: [
      { itemId: 'hornet_driver', quantity: 3 },
      { itemId: 'radio_relay', quantity: 2 },
    ],
    rewardSummary: '4,200 XP + Ferro Battle Rifle + Heavy Ammo',
  },
  {
    questId: 'quest_leaper_autopsy',
    questName: 'Apex Predator Autopsy',
    traderName: 'Lance',
    mapName: 'Blue Gate',
    requiredItems: [
      { itemId: 'leaper_pulse_unit', quantity: 2 },
      { itemId: 'antiseptic', quantity: 3 },
    ],
    rewardSummary: '5,000 XP + Looter Augment Mk.2 + 4,000 Coins',
  },
  {
    questId: 'quest_orbital_signal',
    questName: 'Echoes Above the Orbit',
    traderName: 'Celeste',
    mapName: 'The Spaceport',
    requiredItems: [
      { itemId: 'bombardier_cell', quantity: 1 },
      { itemId: 'tellurion', quantity: 2 },
      { itemId: 'arc_powercell', quantity: 5 },
    ],
    rewardSummary: '8,500 XP + Legendary Augment Schematic',
  },
];

export const PROJECT_STAGES: ProjectStageSpec[] = [
  // Stage 1 is completed ('past'); Stages 2 & 3 are uncompleted ('future')
  {
    projectId: 'project_expedition_rig',
    projectName: 'Deep Surface Expedition Rig',
    stageNumber: 1,
    requiredItems: [
      { itemId: 'metal_parts', quantity: 15 },
      { itemId: 'rubber_parts', quantity: 10 },
      { itemId: 'rusted_gear_casing', quantity: 3 },
    ],
    rewardSummary: '+5 Stash Capacity & Reinforced Chassis Frame',
  },
  {
    projectId: 'project_expedition_rig',
    projectName: 'Deep Surface Expedition Rig',
    stageNumber: 2,
    requiredItems: [
      { itemId: 'arc_alloy', quantity: 10 },
      { itemId: 'leaper_pulse_unit', quantity: 1 },
      { itemId: 'radio_relay', quantity: 2 },
    ],
    rewardSummary: '+10 Stash Capacity & Long-Range Telemetry Array',
  },
  {
    projectId: 'project_expedition_rig',
    projectName: 'Deep Surface Expedition Rig',
    stageNumber: 3,
    requiredItems: [
      { itemId: 'tellurion', quantity: 2 },
      { itemId: 'bombardier_cell', quantity: 2 },
      { itemId: 'arc_powercell', quantity: 6 },
    ],
    rewardSummary: 'Apex Raider Prestige Banner & +15 Stash Capacity',
  },
];

export const WEAPON_UPGRADE_REQUIREMENTS: WeaponUpgradeRequirementSpec[] = [
  {
    id: 'weapon_upgrade_rattler_tier2',
    weaponItemId: 'rattler_ar',
    weaponName: 'Rattler I -> II Upgrade',
    tier: 2,
    requiredItems: [
      { itemId: 'metal_parts', quantity: 6 },
      { itemId: 'rusted_gear_casing', quantity: 2 },
    ],
  },
  {
    id: 'weapon_upgrade_anvil_tier2',
    weaponItemId: 'anvil_hc',
    weaponName: 'Anvil Tier II Heavy Barrel',
    tier: 2,
    requiredItems: [
      { itemId: 'wasp_driver', quantity: 1 },
      { itemId: 'arc_alloy', quantity: 4 },
    ],
  },
  {
    id: 'weapon_upgrade_ferro_tier2',
    weaponItemId: 'ferro_br',
    weaponName: 'Ferro Tier II Magnetic Bolt',
    tier: 2,
    requiredItems: [
      { itemId: 'hornet_driver', quantity: 1 },
      { itemId: 'fireball_burner', quantity: 1 },
    ],
  },
];

export const DEFAULT_LIVE_MAP_CONDITIONS: LiveMapCondition[] = [
  {
    mapSlug: 'dam-battleground',
    mapName: 'Dam Battleground',
    activeCondition: 'Electromagnetic Storm & Swarm Surge',
    hazardLevel: 'Moderate',
    activeEvents: ['Wasp & Snitch Aerial Surge', 'Red Lakes Leaper Ambush'],
    bonusLootTags: ['ARC Parts +35%', 'Tech Crates Unsealed'],
    expiresInMinutes: 28,
  },
  {
    mapSlug: 'the-spaceport',
    mapName: 'The Spaceport',
    activeCondition: 'Night Raid: Orbital Telemetry Drop',
    hazardLevel: 'High',
    activeEvents: ['Control Tower Signal Boost', 'Hornet Escort Convoys'],
    bonusLootTags: ['High-Tech Relays +40%', 'Apex Core Spawn'],
    expiresInMinutes: 42,
  },
  {
    mapSlug: 'buried-city',
    mapName: 'Buried City',
    activeCondition: 'Dust Squall & Medical Convoy Wreck',
    hazardLevel: 'Moderate',
    activeEvents: ['Sunken Hospital Supply Cache', 'Metro Fireball Patrols'],
    bonusLootTags: ['Medical Supplies +50%', 'Old World Trinkets'],
    expiresInMinutes: 35,
  },
  {
    mapSlug: 'blue-gate',
    mapName: 'Blue Gate',
    activeCondition: 'Armored Lockdown',
    hazardLevel: 'High',
    activeEvents: ['Leaper Perimeter Breach', 'Customs Vault Power-Up'],
    bonusLootTags: ['Epic ARC Cores', 'Shield Modules'],
    expiresInMinutes: 19,
  },
  {
    mapSlug: 'stella-montis',
    mapName: 'Stella Montis',
    activeCondition: 'Whiteout Blizzard & Siege Alert',
    hazardLevel: 'Extreme',
    activeEvents: ['Bombardier Summit Siege', 'Cryo Reliquary Unlock'],
    bonusLootTags: ['Legendary Tellurion Chance', 'Heavy Ordnance Crates'],
    expiresInMinutes: 51,
  },
];

export const DEMO_PLAYER_STATE: PlayerProgressState = {
  username: 'Valkyrie_Seven',
  level: 24,
  raiderCoins: 14850,
  stashCapacity: 30,
  stash: [
    // Loadout gear in stash (partial 5-raid readiness)
    { slotIndex: 0, itemId: 'rattler_ar', quantity: 2 },
    { slotIndex: 1, itemId: 'anvil_hc', quantity: 2 },
    { slotIndex: 2, itemId: 'il_toro_sg', quantity: 1 },
    { slotIndex: 3, itemId: 'light_shield', quantity: 2 },
    { slotIndex: 4, itemId: 'combat_augment_mk1', quantity: 2 },
    { slotIndex: 5, itemId: 'antiseptic_kit', quantity: 3 },
    { slotIndex: 6, itemId: 'medium_ammo', quantity: 3 },

    // Protected Rare ARC Parts & Critical Upgrade Items
    { slotIndex: 7, itemId: 'leaper_pulse_unit', quantity: 1 },
    { slotIndex: 8, itemId: 'wasp_driver', quantity: 2 },
    { slotIndex: 9, itemId: 'hornet_driver', quantity: 1 },
    { slotIndex: 10, itemId: 'tellurion', quantity: 1 },
    { slotIndex: 11, itemId: 'arc_alloy', quantity: 14 },
    { slotIndex: 12, itemId: 'durable_cloth', quantity: 6 },

    // Recyclable non-critical salvage scrap (used only in past quests/upgrades)
    { slotIndex: 13, itemId: 'damaged_optics', quantity: 4 },
    { slotIndex: 14, itemId: 'frayed_wiring', quantity: 5 },
    { slotIndex: 15, itemId: 'rusted_gear_casing', quantity: 4 },

    // High-value Vendor Trinkets (sell immediately; past relic quest already completed)
    { slotIndex: 16, itemId: 'bronze_statuette', quantity: 2 },
    { slotIndex: 17, itemId: 'fine_wristwatch', quantity: 1 },
  ],
  loadout: {
    primaryWeaponId: 'rattler_ar',
    secondaryWeaponId: 'anvil_hc',
    shieldId: 'medium_shield',
    augmentId: 'looter_augment_mk2',
    quickUseItemIds: ['antiseptic_kit', 'shield_recharger', 'smoke_grenade'],
    ammoStacks: [
      { itemId: 'medium_ammo', quantity: 2 },
      { itemId: 'heavy_ammo', quantity: 1 },
    ],
  },
  hideoutLevels: {
    gunsmith: 2,
    medical_station: 1,
    gear_bench: 2,
    tech_bench: 1,
    refiner: 2,
  },
  completedQuestIds: [
    'quest_clear_water_treatment',
    'quest_relics_of_old_world',
    'quest_salvage_field_optics',
  ],
  activeQuestIds: [
    'quest_wasp_menace',
    'quest_hornet_telemetry',
    'quest_leaper_autopsy',
    'quest_orbital_signal',
  ],
  completedProjectStages: {
    project_expedition_rig: 1,
  },
  learnedBlueprintIds: [
    'craft_rattler_ar',
    'craft_anvil_hc',
    'craft_light_shield',
    'craft_medium_shield',
    'craft_combat_augment_mk1',
    'craft_antiseptic_kit',
    'craft_shield_recharger',
    'craft_medium_ammo',
    'weapon_upgrade_rattler_tier2',
  ],
  syncedAt: '2026-10-18T19:30:00.000Z',
  syncSource: 'demo-profile',
};
