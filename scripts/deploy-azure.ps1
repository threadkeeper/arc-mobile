<#
.SYNOPSIS
    Deploys ARC Raiders Mobile Web Companion (`arc-mobile`) to Azure Container Apps in `rg-gaia`.
    Reuses existing Azure resources from `C:\repos\gaia-robot`:
      - Resource Group: `rg-gaia` (`swedencentral`)
      - Container Registry: `gaiarobotacr202045`
      - Container Apps Environment: `gaia-env-fqs5sba6zmcju`
      - Azure AI Foundry: `gaia-foundry-202045` (`gpt-6-astra`)
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-gaia',
    [string]$AcrName = 'gaiarobotacr202045',
    [string]$ContainerAppEnv = 'gaia-env-fqs5sba6zmcju',
    [string]$FoundryAccount = 'gaia-foundry-202045',
    [string]$AppName = 'arc-mobile'
)

$ErrorActionPreference = 'Stop'
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$AzPython = 'C:\Users\Admin\azcli-venv\Scripts\python.exe'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$ImageTag = "v$(Get-Date -Format 'yyyyMMddHHmmss')"
$FullImage = "$AcrName.azurecr.io/${AppName}:$ImageTag"

Write-Host "=== 1. Building Container Image in ACR ($FullImage) ===" -ForegroundColor Cyan
& $AzPython -m azure.cli acr build --registry $AcrName --resource-group $ResourceGroup --image "${AppName}:$ImageTag" --image "${AppName}:latest" .
if ($LASTEXITCODE -ne 0) {
    throw "ACR build failed with exit code $LASTEXITCODE"
}

Write-Host "=== 2. Deploying Container App ($AppName in $ContainerAppEnv) ===" -ForegroundColor Cyan
$existingApp = & $AzPython -m azure.cli containerapp list --resource-group $ResourceGroup --query "[?name=='$AppName'].name" -o tsv
if (-not $existingApp) {
    & $AzPython -m azure.cli containerapp create `
        --name $AppName `
        --resource-group $ResourceGroup `
        --environment $ContainerAppEnv `
        --image $FullImage `
        --registry-server "$AcrName.azurecr.io" `
        --registry-identity system `
        --system-assigned `
        --target-port 8080 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 2 `
        --cpu 0.5 `
        --memory 1.0Gi `
        --env-vars "PORT=8080" "FOUNDRY_PROXY_PORT=8080" "FOUNDRY_ENDPOINT=https://$FoundryAccount.openai.azure.com/openai/v1/responses" "FOUNDRY_MODEL=gpt-6-astra"
} else {
    & $AzPython -m azure.cli containerapp update `
        --name $AppName `
        --resource-group $ResourceGroup `
        --image $FullImage `
        --set-env-vars "PORT=8080" "FOUNDRY_PROXY_PORT=8080" "FOUNDRY_ENDPOINT=https://$FoundryAccount.openai.azure.com/openai/v1/responses" "FOUNDRY_MODEL=gpt-6-astra"
}

if ($LASTEXITCODE -ne 0) {
    throw "Container App deployment failed with exit code $LASTEXITCODE"
}

Write-Host "=== 3. Ensuring Managed Identity RBAC on $FoundryAccount ===" -ForegroundColor Cyan
$principalId = (& $AzPython -m azure.cli containerapp show --name $AppName --resource-group $ResourceGroup --query "identity.principalId" -o tsv).Trim()
$foundryId = (& $AzPython -m azure.cli cognitiveservices account show --name $FoundryAccount --resource-group $ResourceGroup --query "id" -o tsv).Trim()

foreach ($role in @('Cognitive Services OpenAI User', 'Cognitive Services User', 'Foundry User')) {
    & $AzPython -m azure.cli role assignment create --assignee-object-id $principalId --assignee-principal-type ServicePrincipal --role $role --scope $foundryId 2>$null | Out-Null
}

$fqdn = (& $AzPython -m azure.cli containerapp show --name $AppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv).Trim()
$prodUrl = "https://$fqdn"
Write-Host "[OK] Production URL: $prodUrl" -ForegroundColor Green
