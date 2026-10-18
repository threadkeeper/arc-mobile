---
name: "build-parallel"
description: "Run the arc-coordinator agent to dispatch all 4 specialist agents in parallel, run the Vitest suite, build the mobile web bundle, and verify the live Azure AI Foundry agent."
agent: "arc-coordinator"
argument-hint: "Optional focus area or feature adjustment for the parallel build"
---

Coordinate the parallel build and verification of the **ARC Raiders Mobile-Friendly Web App (`arc-mobile`)**:

1. Inspect [src/shared/types.ts](../../src/shared/types.ts) and confirm the shared contract for Auth/Sync, Foundry Autonomous Brain, Tab 1 Prep (5-raid loadouts + rules a/b/c), Tab 2 Top 3 Raid Ideas, and Tab 3 Inventory Smash (grey past, color-coded future, red missing items, and best places to find them).
2. Dispatch `arc-auth-sync-agent`, `arc-prep-engine-agent`, `arc-foundry-brain-agent`, and `arc-ui-tabs-agent` **in parallel** using `#tool:agent` (`runSubagent`), enforcing strict disjoint file ownership.
3. Run `npm.cmd test` and `npm.cmd run build` to verify all unit, engine, service, and UI tests pass and the production web bundle compiles cleanly.
4. Run `powershell -ExecutionPolicy Bypass -File .\scripts\verify-live-foundry.ps1` to verify the autonomous Azure AI Foundry Agent against `gaia-foundry-202045` in `rg-gaia` (reused from `C:\repos\gaia-robot`).
