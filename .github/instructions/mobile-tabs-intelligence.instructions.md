---
name: "mobile-tabs-intelligence"
description: "Use when implementing or modifying Tab 1 Prep (5-raid loadouts, rare item protection, recycling/refining, immediate sell), Tab 2 Top 3 Raid Ideas, or Tab 3 Inventory Smash (grey past, colored future, red missing items, best farming locations)."
applyTo: "src/engine/**,src/components/**,src/data/**"
---

# Three-Tab Intelligence & UI Rules

## Tab 1: Prep (5-Raid Loadout & Stash Space Optimizer)
1. **Target Goal — 5 Raids Worth of Loadouts:**
   - Calculate the gap between the player's current ready gear and **5 full raid kits** (5 primary weapons, 5 secondary weapons/sidearms, 5 shields, 5 augments, 15 healing consumables, 10 tactical utility items, and 5 raids worth of matching ammo stacks).
   - Output concrete `CRAFT`, `REFINE`, and `RECYCLE` steps in execution order so the player can prep 5 raid kits efficiently.
2. **Rule 1a — Protect Rare & Critical Upgrade Items (`PROTECTED`):**
   - Compute the full set of items required by **future (uncompleted)** Hideout/Workshop station upgrades, Expedition project stages, and active/upcoming Quests.
   - Any item that is rare (`epic` / `legendary` / ARC boss component) or needed for a future upgrade/quest up to its required threshold MUST be marked `protectedForFuture: true` and **never** consumed for routine crafting or recycling.
3. **Rule 1b — Free Stash Space via Recycling, Refining & Building (`RECYCLE_FOR_SPACE` / `REFINE_FOR_SPACE`):**
   - Any item not locked by Rule 1a and not directly equipped in the 5-raid loadouts is a candidate for recycling or refining into stackable materials/loadout gear.
   - Always calculate and display `slotsFreed` so the player sees how many stash slots each action recovers.
4. **Rule 1c — Sell Immediately (`SELL_IMMEDIATELY`):**
   - Items with zero future upgrade/quest demand and whose direct Raider Coin vendor price beats their recycle utility (such as luxury trinkets, statuettes, watches, jewelry, or excess common scrap beyond stack caps) must be flagged `SELL_IMMEDIATELY` with their coin payout.

## Tab 2: Top 3 Raid Ideas
- Rank the **Top 3 Raid Ideas** based on:
  1. Active map conditions/events (e.g., Night Raid, Electromagnetic Storm, High-Value Cache, Harvester) from live API/Foundry web search.
  2. The player's missing quest objectives and missing upgrade items from Tab 3.
  3. **Loadout Feasibility:** Every recommended raid must be achievable with the player's current/prepped loadout tier (never send a light-shield pistol kit into a Queen/Baron stronghold without a stealth route).
- Each raid card must include: Map Name, Active Condition, Loadout Match Score, Expected Rewards, and a **4–5 step actionable raid walkthrough** (Drop/Spawn -> Primary Loot/Quest Target -> High-Value/Key Check -> Safe Extraction).

## Tab 3: Inventory Smash
1. **Current Inventory with Past & Future Requirement Notes:**
   - Every owned item displays requirement badges/notes for all upgrades, quests, and projects that use it:
     - **Past (Completed):** Styled in **grey** (`status: 'past'`, muted grey pill/text).
     - **Future (Uncompleted/Active):** Highlighted in distinct semantic colors based on `requirementType`:
       - `quest` -> **Cyan/Blue**
       - `hideout_upgrade` -> **Amber/Gold**
       - `project` -> **Purple**
       - `weapon_upgrade` -> **Emerald/Green**
2. **Missing Required Items (Highlighted in Red Text):**
   - Every item required for an uncompleted quest, workshop upgrade, or project where `ownedQuantity < requiredQuantity` must appear in the **Missing Required Items** section with **red text** (`#ef4444` / `.missing-red-text`) showing `Missing X (Have Y / Need Z)`.
3. **Best Place to Find It (Farming Guide):**
   - Include a dedicated section showing where to farm each missing item: specific Map(s), POI landmarks, loot container category (e.g., Medical, Tech, Industrial, Security, Residential), and specific ARC unit drops (e.g., Leaper, Wasp, Hornet, Snitch, Bombardier).
