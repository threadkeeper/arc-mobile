# ARC Raiders Mobile Web Companion (`arc-mobile`)

A mobile-friendly tactical web companion for **ARC Raiders** players powered by an autonomous **Azure AI Foundry Agent** (reusing the `gaia-foundry-202045` / `rg-gaia` deployment from `C:\repos\gaia-robot`).

Because ARC Raiders and community APIs are **read-only**, this app authenticates the player once (persisting their ARC Tracker key in `localStorage` + a 365-day backup cookie, with 1-click browser/clipboard pull), reads their live stash/loadout/progression, and runs an autonomous Foundry Agent loop over the full game catalog and live map event rotations to drive three tactical tabs:

1. **Tab 1 — Prep (5-Raid Loadouts):**
   - Computes exact **Recycling, Refining, and Crafting** steps to prepare **5 full raids worth of loadouts**.
   - **Rule (a) Rare & Future Upgrade Lock:** Never consumes or recycles rare ARC components or items required for **future** workshop upgrades, quests, or projects.
   - **Rule (b) Stash Space Recovery:** Marks all non-protected items not needed for the 5-raid loadouts as candidates for recycling/refining/building and shows exact stash slots freed (`+N Slots Freed`).
   - **Rule (c) Sell Immediately:** Flags zero-utility trinkets and surplus items to sell immediately for Raider Coins.
2. **Tab 2 — Top 3 Raid Ideas:**
   - Recommends the **Top 3 Raids** based on active map conditions/events, loadout feasibility, and missing quest/upgrade items, complete with a **4-step execution walkthrough** (`Insertion` → `Primary Objective` → `High-Value Loot` → `Extraction`).
3. **Tab 3 — Inventory Smash:**
   - **Current Inventory:** Annotates every owned item with requirement badges for every upgrade or quest it belongs to — **past (completed)** in **grey**, **future (upcoming)** color-coded by type (`quest` = cyan, `hideout_upgrade` = amber, `project` = purple, `weapon_upgrade` = emerald).
   - **Missing Required Items:** Highlights every missing item required for future upgrades and quests in **red text** (`#ef4444`) with exact deficit counts.
   - **Best Place to Find It:** Shows the best maps, POI buildings, container categories, and ARC machine drops for every missing item.

---

## Multi-Agent Parallel Architecture (`.github/`)

- **Global Instructions:** [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- **Scoped Instructions:**
  - [`.github/instructions/foundry-azure.instructions.md`](.github/instructions/foundry-azure.instructions.md)
  - [`.github/instructions/mobile-tabs-intelligence.instructions.md`](.github/instructions/mobile-tabs-intelligence.instructions.md)
- **Coordinator Agent:** [`.github/agents/arc-coordinator.agent.md`](.github/agents/arc-coordinator.agent.md)
- **Parallel Specialist Subagents (Strict Disjoint File Ownership):**
  1. [`.github/agents/arc-auth-sync-agent.agent.md`](.github/agents/arc-auth-sync-agent.agent.md) — Auth persistence, browser/clipboard key pull, ARC Tracker & MetaForge sync
  2. [`.github/agents/arc-prep-engine-agent.agent.md`](.github/agents/arc-prep-engine-agent.agent.md) — Static game catalog, Tab 1 Prep (5-raid + Rules a/b/c), Tab 2 Raid Planner, Tab 3 Inventory Smash engine
  3. [`.github/agents/arc-foundry-brain-agent.agent.md`](.github/agents/arc-foundry-brain-agent.agent.md) — Autonomous Azure AI Foundry Responses API loop (`gpt-6-astra` + hosted `web_search` on `gaia-foundry-202045`)
  4. [`.github/agents/arc-ui-tabs-agent.agent.md`](.github/agents/arc-ui-tabs-agent.agent.md) — Mobile-friendly 3-tab React web UI & component tests
- **Slash-Command Prompt:** [`.github/prompts/build-parallel.prompt.md`](.github/prompts/build-parallel.prompt.md) (`/build-parallel`)

---

## Quick Start & Verification Steps

Keep credentials in local environment variables or an ignored `.env` file. The
committed `.env.sample` contains configuration placeholders only. Dependencies,
build output, coverage, local environment files, and private key files are excluded
from Git; never add player token exports or other credentials to the repository.

```powershell
# 1. Run the full Vitest suite (24 unit, engine, service, and UI tests)
npm.cmd test

# 2. Build the production mobile web bundle
npm.cmd run build

# 3. Verify live Azure AI Foundry connection (reusing rg-gaia / gaia-foundry-202045)
powershell -ExecutionPolicy Bypass -File .\scripts\verify-live-foundry.ps1

# 4. Launch the local Foundry proxy (:8787) + mobile web app (:5173)
powershell -ExecutionPolicy Bypass -File .\scripts\run-local.ps1
```
