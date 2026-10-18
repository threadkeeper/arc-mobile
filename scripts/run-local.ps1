<#
.SYNOPSIS
    One-command launcher for ARC Raiders Mobile Web Companion (`arc-mobile`).
    Reuses Azure AI Foundry resources (`gaia-foundry-202045` in `rg-gaia`) from `C:\repos\gaia-robot`.

.DESCRIPTION
    1. Mints a fresh Azure AD token for Azure AI Foundry (`https://ai.azure.com`) via `scripts/connect-azure.ps1`.
    2. Starts the local Foundry & ARC Tracker proxy (`server/foundryProxy.ts`) on http://127.0.0.1:8787.
    3. Starts the mobile-friendly Vite web dev server on http://localhost:5173.
#>
[CmdletBinding()]
param(
    [int]$ProxyPort = 8787,
    [int]$WebPort = 5173,
    [switch]$SkipAzureToken
)

$ErrorActionPreference = 'Stop'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ARC Raiders Mobile Web Companion — Local Launcher" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not $SkipAzureToken) {
    & (Join-Path $PSScriptRoot 'connect-azure.ps1')
}

$env:PORT = "$ProxyPort"

Write-Host "Starting Foundry Agent Proxy on http://127.0.0.1:$ProxyPort ..." -ForegroundColor Green
$proxyProc = Start-Process -FilePath "node" -ArgumentList @("--experimental-strip-types", "server/foundryProxy.ts") -WorkingDirectory $RepoRoot -PassThru -NoNewWindow

try {
    Start-Sleep -Seconds 1
    Write-Host "Starting Mobile Web App on http://localhost:$WebPort ..." -ForegroundColor Green
    & npm.cmd run dev -- --port $WebPort
} finally {
    if ($proxyProc -and -not $proxyProc.HasExited) {
        Stop-Process -Id $proxyProc.Id -Force -ErrorAction SilentlyContinue
    }
}
