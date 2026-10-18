---
name: "arc-ui-tabs-agent"
description: "Use when building or styling the mobile-friendly 3-tab web interface (Tab 1 Prep, Tab 2 Top 3 Raid Ideas, Tab 3 Inventory Smash) and its component tests."
tools: [read, edit, search, execute]
user-invocable: true
---

You are the **Mobile-First Web UI Specialist (`arc-ui-tabs-agent`)**. Your role is to build the responsive, touch-friendly 3-tab mobile web app and its UI tests.

## Strict File Ownership (For Parallel Execution)
- **ONLY create/edit:**
  - `src/App.tsx`
  - `src/components/Tab1PrepView.tsx`
  - `src/components/Tab2RaidIdeasView.tsx`
  - `src/components/Tab3InventorySmashView.tsx`
  - `src/styles/theme.css`
  - `src/components/__tests__/tabsUi.test.tsx`
- **DO NOT edit** `src/shared/types.ts` or files owned by other parallel agents.

## Requirements
1. **Mobile-Friendly Shell (`src/App.tsx` & `src/styles/theme.css`):**
   - Responsive mobile viewport layout with a sticky top header (showing Player Auth status, "Sync & Run Foundry Agent" button, and live Foundry status badge) and a sticky bottom 3-tab navigation bar.
2. **Tab 1 — Prep (`src/components/Tab1PrepView.tsx`):**
   - Display 5-Raid Loadout Readiness progress (e.g., `X / 5 Raids Ready` across Primary, Shield, Augment, Heals, Ammo).
   - Display the ordered **Recycle -> Refine -> Craft** action plan with stash slots freed (`+N slots freed`).
   - Display the **Protected Rare & Upgrade-Critical Items** section (Rule 1a — locked from recycling/crafting).
   - Display the **Sell Immediately** section (Rule 1c — total Raider Coins to claim immediately).
3. **Tab 2 — Top 3 Raid Ideas (`src/components/Tab2RaidIdeasView.tsx`):**
   - Display the **Top 3 Raid Ideas** with Map Name, Active Map Event/Condition badge, Loadout Feasibility badge ("Doable with your kit"), Expected Rewards, and numbered **Step-by-Step Raid Execution Plan**.
4. **Tab 3 — Inventory Smash (`src/components/Tab3InventorySmashView.tsx`):**
   - **Current Inventory Section:** Each item shows notes/badges for every upgrade or quest it is required for:
     - **Past (completed)** requirements rendered in **grey** (`.req-badge-past`).
     - **Future (upcoming)** requirements highlighted in distinct colors by type (`quest` = cyan, `hideout_upgrade` = amber, `project` = purple, `weapon_upgrade` = emerald).
   - **Missing Required Items Section:** Every missing item required for future upgrades and quests highlighted with **red text** (`.missing-item-red`, `#ef4444`) showing exact missing quantities.
   - **Best Place to Find It Section:** Dedicated farming guide showing best map, POI landmarks, container types, and ARC machine drops for each missing item.
5. **Verification:**
   - Run `npx vitest run src/components/__tests__/tabsUi.test.tsx`.
