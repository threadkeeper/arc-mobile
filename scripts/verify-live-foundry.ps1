<#
.SYNOPSIS
  Verifies live connectivity to Azure AI Foundry (gaia-foundry-202045 in rg-gaia)
  using C:\Users\Admin\azcli-venv\Scripts\python.exe -m azure.cli and gpt-6-astra.
#>
$ErrorActionPreference = "Stop"

$FoundryEndpoint = "https://gaia-foundry-202045.openai.azure.com/openai/v1/responses"
$PrimaryModel = "gpt-6-astra"
$FallbackModel = "model-router"
$AzPythonExe = "C:\Users\Admin\azcli-venv\Scripts\python.exe"

Write-Host "=== Verifying Live Azure AI Foundry Agent (gaia-foundry-202045 / rg-gaia) ===" -ForegroundColor Cyan

if (-not (Test-Path $AzPythonExe)) {
    throw "Azure CLI Python executable not found at $AzPythonExe"
}

$token = (& $AzPythonExe -m azure.cli account get-access-token `
    --resource "https://ai.azure.com" `
    --query accessToken `
    -o tsv).Trim()

if (-not $token -or $token.Length -lt 20) {
    throw "Failed to acquire Azure AD token for https://ai.azure.com"
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

$promptText = @"
You are the ARC Raiders Autonomous Tactical Foundry Agent.
Player readiness: 3/5 raid kits ready. Protected items: Leaper Pulse Unit (x2 for Medical Station L3), Tellurion (x4 for Refiner L2).
Missing items: Bombardier Cell (missing 2), Antiseptic (missing 3).
Return ONLY a compact JSON object with keys:
- tab1Summary: concise 1-sentence 5-raid prep instruction protecting Leaper Pulse Unit and Tellurion.
- tab2Commentary: concise 1-sentence recommendation for top raid on Dam Battleground or Spaceport.
- tab3FarmingTip: concise 1-sentence farming tip for Bombardier Cell and Antiseptic.
"@

$requestObj = @{
    model   = $PrimaryModel
    store   = $false
    input   = @(
        @{
            role    = "user"
            content = $promptText
        }
    )
}

$bodyJson = $requestObj | ConvertTo-Json -Depth 10
$activeModel = $PrimaryModel

try {
    $response = Invoke-WebRequest -Uri $FoundryEndpoint -Method Post -Headers $headers -Body $bodyJson -UseBasicParsing -TimeoutSec 60
} catch {
    Write-Host "[WARN] Primary model '$PrimaryModel' returned an error, retrying with '$FallbackModel'..." -ForegroundColor Yellow
    $activeModel = $FallbackModel
    $requestObj.model = $FallbackModel
    $bodyJson = $requestObj | ConvertTo-Json -Depth 10
    $response = Invoke-WebRequest -Uri $FoundryEndpoint -Method Post -Headers $headers -Body $bodyJson -UseBasicParsing -TimeoutSec 60
}

$statusCode = [int]$response.StatusCode
$parsed = $response.Content | ConvertFrom-Json

$outputText = ""
if ($parsed.output_text) {
    $outputText = $parsed.output_text
} elseif ($parsed.output) {
    foreach ($item in $parsed.output) {
        if ($item.content) {
            foreach ($part in $item.content) {
                if ($part.text) {
                    $outputText += $part.text
                }
            }
        }
    }
}

Write-Host "[OK] HTTP Status: $statusCode" -ForegroundColor Green
Write-Host "[OK] Model Used:  $($parsed.model | ForEach-Object { $_ } )" -ForegroundColor Green
Write-Host "[OK] Response ID: $($parsed.id)" -ForegroundColor Green
Write-Host "--- Structured Output ---" -ForegroundColor Cyan
Write-Host $outputText
