---
name: "foundry-azure"
description: "Use when configuring or calling Azure AI Foundry, reusing C:\\repos\\gaia-robot Azure resources in rg-gaia, minting AAD tokens, or implementing the autonomous Responses API web_search and tool loop."
applyTo: "src/services/**,server/**,scripts/**"
---

# Azure AI Foundry & `gaia-robot` Resource Reuse Guidelines

## Reused Azure Resources (`C:\repos\gaia-robot`)
- **Resource Group:** `rg-gaia` (`swedencentral`)
- **Foundry Account:** `gaia-foundry-202045`
- **Responses API URL:** `https://gaia-foundry-202045.openai.azure.com/openai/v1/responses`
- **Primary Model Deployment:** `gpt-6-astra` (supports `/openai/v1/responses`, autonomous tool calls, and hosted `{"type": "web_search"}`)
- **Fallback Model Deployment:** `model-router`

## Authentication Order of Precedence
1. `FOUNDRY_API_KEY` environment variable (sent via `api-key` header) if explicitly configured in `.env` or `C:\repos\gaia-robot\infra\.env`.
2. `FOUNDRY_AAD_TOKEN` environment variable (sent via `Authorization: Bearer <token>`), minted keylessly via:
   ```powershell
   C:\Users\Admin\azcli-venv\Scripts\python.exe -m azure.cli account get-access-token --resource https://ai.azure.com --query accessToken -o tsv
   ```
3. Never hardcode or commit tokens or secrets into any tracked file.

## Autonomous Foundry Agent Contract
- Use `POST https://gaia-foundry-202045.openai.azure.com/openai/v1/responses` with `"store": false`.
- Attach the hosted web search tool `{"type": "web_search"}` and `"include": ["web_search_call.action.sources"]` when querying live ARC Raiders map rotations, events, or patch notes.
- Provide the agent with:
  1. The player's current synced stash, loadout, workshop station levels, learned blueprints, quests, and expedition projects.
  2. The deterministic pre-computed analysis from `prepIntelligence.ts` and `inventorySmash.ts` so numerical quantities (protected upgrade items, 5-raid counts, missing item deficits) are 100% exact and never hallucinated.
  3. Always fall back gracefully to deterministic local intelligence if the user is offline on Android without cellular/Foundry connectivity.
