<#
.SYNOPSIS
  Connects arc-mobile to the existing Azure AI Foundry resources from C:\repos\gaia-robot
  (Resource Group: rg-gaia, Account: gaia-foundry-202045, Model: gpt-6-astra).
  Mints a session AAD token into $env:FOUNDRY_AAD_TOKEN without printing any raw secret.
#>
$ErrorActionPreference = "Stop"

$GaiaRepoPath = "C:\repos\gaia-robot"
$GaiaEnvPath = "C:\repos\gaia-robot\infra\.env"
$ResourceGroup = "rg-gaia"
$FoundryAccount = "gaia-foundry-202045"
$FoundryEndpoint = "https://gaia-foundry-202045.openai.azure.com/openai/v1/responses"
$PrimaryModel = "gpt-6-astra"
$FallbackModel = "model-router"
$AzPythonExe = "C:\Users\Admin\azcli-venv\Scripts\python.exe"

Write-Host "=== ARC-Mobile Azure AI Foundry Connection Check ===" -ForegroundColor Cyan

if (Test-Path $GaiaRepoPath) {
    Write-Host "[OK] Found reusable Azure workspace at $GaiaRepoPath" -ForegroundColor Green
} else {
    Write-Host "[WARN] $GaiaRepoPath directory not found on disk; proceeding with rg-gaia Azure CLI check." -ForegroundColor Yellow
}

if (-not $env:FOUNDRY_API_KEY -and (Test-Path $GaiaEnvPath)) {
    $envLines = Get-Content $GaiaEnvPath -ErrorAction SilentlyContinue
    foreach ($line in $envLines) {
        if ($line -match '^\s*FOUNDRY_API_KEY\s*=\s*(.+)\s*$') {
            $candidateKey = $Matches[1].Trim().Trim('"').Trim("'")
            if ($candidateKey.Length -gt 0) {
                $env:FOUNDRY_API_KEY = $candidateKey
                Write-Host "[OK] Loaded FOUNDRY_API_KEY from $GaiaEnvPath (value hidden)" -ForegroundColor Green
            }
        }
    }
}

if (-not (Test-Path $AzPythonExe)) {
    throw "Azure CLI Python environment not found at $AzPythonExe"
}

Write-Host "Checking Azure resource group '$ResourceGroup' and Foundry account '$FoundryAccount'..." -ForegroundColor Cyan
$accountJson = & $AzPythonExe -m azure.cli cognitiveservices account show `
    --name $FoundryAccount `
    --resource-group $ResourceGroup `
    -o json 2>$null

if ($LASTEXITCODE -eq 0 -and $accountJson) {
    $accountInfo = $accountJson | ConvertFrom-Json
    Write-Host "[OK] Verified Foundry account: $($accountInfo.name) ($($accountInfo.location), state=$($accountInfo.properties.provisioningState))" -ForegroundColor Green
} else {
    Write-Host "[INFO] Cognitive Services show skipped or limited permissions; attempting token mint directly." -ForegroundColor Yellow
}

Write-Host "Minting Azure AD access token for https://ai.azure.com ..." -ForegroundColor Cyan
$token = (& $AzPythonExe -m azure.cli account get-access-token `
    --resource "https://ai.azure.com" `
    --query accessToken `
    -o tsv).Trim()

if (-not $token -or $token.Length -lt 20) {
    throw "Failed to mint Azure AD access token for https://ai.azure.com"
}

$env:FOUNDRY_AAD_TOKEN = $token
$env:FOUNDRY_ENDPOINT = $FoundryEndpoint
$env:FOUNDRY_MODEL = $PrimaryModel

Write-Host "[OK] Minted AAD token into `$env:FOUNDRY_AAD_TOKEN (length: $($token.Length) chars, value hidden)" -ForegroundColor Green
Write-Host "[OK] Endpoint:       $FoundryEndpoint" -ForegroundColor Green
Write-Host "[OK] Primary Model:  $PrimaryModel (Fallback: $FallbackModel)" -ForegroundColor Green
Write-Host "[OK] Resource Group: $ResourceGroup" -ForegroundColor Green
