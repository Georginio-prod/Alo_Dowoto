# Construit un APK installable de l'app WorkTogo mobile et le copie dans dist/.
# Prérequis (une seule fois) : Android Studio > SDK Manager > cocher
#   "NDK (Side by side)" et "CMake", puis Apply. Java (JBR) et le SDK sont déjà là.
#
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
#          (ajouter -Release pour un AAB/APK signé de production)
param([switch]$Release)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot   # apps/mobile

# --- Outillage déjà présent sur ce poste (détecté automatiquement) ---
$jbr = 'C:\Program Files\Android\Android Studio\jbr'
if (Test-Path $jbr) { $env:JAVA_HOME = $jbr }
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdk) { $env:ANDROID_HOME = $sdk; $env:ANDROID_SDK_ROOT = $sdk }
Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"

Set-Location $root

if (-not (Test-Path 'node_modules')) { npm install }

# Génère le projet android/ natif à partir de la config Expo.
npx expo prebuild --platform android --no-install

Set-Location (Join-Path $root 'android')
$variant = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
& .\gradlew.bat $variant --no-daemon

# Récupère l'APK produit.
$apk = Get-ChildItem -Recurse -Filter '*.apk' app\build\outputs\apk | Select-Object -First 1
$dist = Join-Path $root 'apk'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$dest = Join-Path $dist 'worktogo.apk'
Copy-Item $apk.FullName $dest -Force
Write-Host "APK prêt : $dest"
