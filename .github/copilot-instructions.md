# ARC Raiders Mobile Web Companion (`arc-mobile`) — Project Guidelines

## Project Scope
`arc-mobile` is a fast-moving, non-commercial **mobile-friendly web app** for **ARC Raiders** players (no native Android/APK packaging required for this round). Because Embark Studios and community APIs are strictly **read-only**, this web app reads the player's synced state and uses an autonomous **Azure AI Foundry Agent** + deterministic domain engine to tell the player exactly how to prepare their stash, which raids to run next, and how every owned or missing item maps to past and future quests and upgrades.

## Tech Stack (Fast Iteration & Mobile-First Web App)
- **Language:** TypeScript (strict mode, shared types in `src/shared/types.ts`)
- **Frontend:** React 19 + Vite (mobile-first responsive viewport, installable web manifest, zero native mobile wrapper dependencies)
- **Foundry Agent & Local API Proxy:** Node.js TypeScript proxy (`server/foundryProxy.ts`) + client orchestrator (`src/services/foundryAgent.ts`)
- **Testing:** Vitest (`npm test`) — run fast unit, engine, and UI tests after every change

## Azure Resource Reuse (From `C:\repos\gaia-robot`)
Do **not** provision duplicate Azure accounts when developing locally or deploying to the hobby environment. Reuse the existing Azure resources from `C:\repos\gaia-robot`:
- **Resource Group:** `rg-gaia` (`swedencentral`)
- **Azure AI Foundry Account:** `gaia-foundry-202045`
- **Foundry Responses API Endpoint:** `https://gaia-foundry-202045.openai.azure.com/openai/v1/responses`
- **Model Deployments:** `gpt-6-astra` (primary autonomous agent + hosted `web_search` tool) and `model-router` (fallback)
- **Optional Serverless Persistence:** `gaia-serverless-20260723` (Cosmos DB NoSQL) and `gaiarobotacr202045` / `gaia-env-fqs5sba6zmcju`
- **Keyless Local Token Minting:** Use `scripts/connect-azure.ps1` (which calls `C:\Users\Admin\azcli-venv\Scripts\python.exe -m azure.cli account get-access-token --resource https://ai.azure.com` or reads `C:\repos\gaia-robot\infra\.env`). **Never** commit API keys, bearer tokens, or `.env` secrets.

## Core Product Architecture (Read-Only API + Autonomous Foundry Loop)
1. **Persistent Player Auth & Browser Pull (`src/services/authStore.ts`, `src/services/arcTrackerClient.ts`):**
   - Stores the user's ARC Tracker Personal API Key (`arc_u1_...`) and App Key (`arc_k1_...`) persistently in browser storage (`localStorage` + IndexedDB/cookie backup + JSON token export/import) for as long as possible.
   - Provides a **Pull from Browser / Clipboard** flow that opens `https://arctracker.io/settings` (or `https://arctracker.io/ai-connector`) in a tab/popup and automatically reads `arc_u1_...` from URL params, `window.focus` clipboard check, or paste.
   - Pulls live read-only player state (`/api/v2/user/profile`, `/stash`, `/loadout`, `/hideout`, `/quests`, `/projects`, `/blueprints`) and live map event timers (`https://metaforge.app/api/arc-raiders/event-timers`).
2. **Autonomous Foundry Agent (`src/services/foundryAgent.ts`, `server/foundryProxy.ts`):**
   - Combines player stash/loadout/quest/upgrade state with the full static ARC Raiders catalog (`src/data/gameCatalog.ts`) and live map/event search (`web_search` + API tools).
   - Runs an autonomous tool-calling loop to synthesize recommendations for all three tabs.
3. **Three-Tab Mobile Experience:**
   - **Tab 1 — Prep (5-Raid Loadouts):** Computes exact recycling, refining, and crafting steps to prepare **5 full raid loadouts**.
     - *Rule (a):* Never consume or recycle rare/critical items required for **future** upgrades, projects, or quests.
     - *Rule (b):* Mark all non-protected items not needed for the 5-raid loadouts as candidates for **recycling, refining, or crafting** to free stash space (`slotsFreed`).
     - *Rule (c):* Flag items with zero future quest/upgrade/loadout utility to be **sold immediately** for Raider Coins.
   - **Tab 2 — Top 3 Raid Ideas:** Recommends the **top 3 raids** (target map, active map condition/event, loadout feasibility check, expected loot/rewards, and a step-by-step execution guide).
   - **Tab 3 — Inventory Smash:**
     - Lists **current inventory** with requirement notes next to each item: **past** (completed) upgrades/quests in **grey**, **future** (active/upcoming) requirements highlighted in distinct colors by type (`quest` = cyan, `hideout_upgrade` = amber, `project` = purple, `weapon_upgrade` = emerald).
     - Lists **missing items** required for future upgrades and quests highlighted in **red text** (`#ef4444`) with exact deficit quantities.
     - Includes a **Best Place to Find It** section for every missing item (best map, POI zone/building type, loot container, and ARC machine drops).

## Parallel Agent File Ownership
When running parallel subagents under `arc-coordinator`, each agent must **only** modify its owned files to prevent merge/edit conflicts:
- **Shared Contract (Locked by Coordinator):** `src/shared/types.ts`
- **`arc-auth-sync-agent`:** `src/services/authStore.ts`, `src/services/arcTrackerClient.ts`, `src/services/gameCatalogClient.ts`, `src/components/AuthModal.tsx`, `src/services/__tests__/authAndSync.test.ts`
- **`arc-foundry-brain-agent`:** `src/services/foundryAgent.ts`, `server/foundryProxy.ts`, `scripts/connect-azure.ps1`, `scripts/verify-live-foundry.ps1`, `src/services/__tests__/foundryAgent.test.ts`
- **`arc-prep-engine-agent`:** `src/data/gameCatalog.ts`, `src/engine/prepIntelligence.ts`, `src/engine/inventorySmash.ts`, `src/engine/raidPlanner.ts`, `src/engine/__tests__/prepAndSmash.test.ts`
- **`arc-ui-tabs-agent`:** `src/App.tsx`, `src/components/Tab1PrepView.tsx`, `src/components/Tab2RaidIdeasView.tsx`, `src/components/Tab3InventorySmashView.tsx`, `src/styles/theme.css`, `src/components/__tests__/tabsUi.test.tsx`

## Build and Test Commands
On Windows PowerShell, use `npm.cmd` (or `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`):
- `npm.cmd test` — Run all Vitest unit, engine, service, and UI tests
- `npm.cmd run build` — Type-check and build the production mobile web bundle (`dist/`)
- `powershell -ExecutionPolicy Bypass -File .\scripts\connect-azure.ps1` — Mint Foundry AAD token from `C:\repos\gaia-robot` Azure context
- `powershell -ExecutionPolicy Bypass -File .\scripts\verify-live-foundry.ps1` — Verify live autonomous Foundry Agent call against `gaia-foundry-202045`
- `powershell -ExecutionPolicy Bypass -File .\scripts\run-local.ps1` — Start local Foundry proxy (`:8787`) and mobile web dev server (`:5173`)
