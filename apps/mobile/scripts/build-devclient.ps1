# Construit l'APK de DÉVELOPPEMENT (expo-dev-client) : à installer UNE SEULE
# fois. Il ne contient pas le bundle JS figé — il le charge en direct depuis
# le serveur Metro du PC. Résultat : toute modif JS/TS s'applique
# automatiquement (Fast Refresh), sans réinstaller l'APK.
#
# Workflow quotidien après installation :
#   1) démarrer le backend :   npm run dev -- --host        (dans Alo_Dowoto)
#   2) démarrer Metro :        npm start                    (dans apps/mobile)
#   3) ouvrir l'app « WorkTogo (dev) » sur le téléphone -> elle se connecte à
#      Metro et recharge à chaque sauvegarde. Réinstaller UNIQUEMENT si tu
#      ajoutes un module natif ou changes app.config (partie native).
#
# Prérequis : NDK + CMake installés (comme pour build-apk.ps1).
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/build-devclient.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot   # apps/mobile

$jbr = 'C:\Program Files\Android\Android Studio\jbr'
if (Test-Path $jbr) { $env:JAVA_HOME = $jbr }
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdk) { $env:ANDROID_HOME = $sdk; $env:ANDROID_SDK_ROOT = $sdk }
Write-Host "JAVA_HOME=$env:JAVA_HOME`nANDROID_HOME=$env:ANDROID_HOME"

Set-Location $root
if (-not (Test-Path 'node_modules')) { npm install }

# Régénère android/. prebuild (sans --clean) ne réécrit pas toujours
# build.gradle : on retire donc explicitement le patch `debuggableVariants = []`
# (laissé par build-apk.ps1) pour que la variante Debug charge le JS depuis
# Metro au lieu de l'embarquer.
npx expo prebuild --platform android --no-install

$gradle = Join-Path $root 'android\app\build.gradle'
(Get-Content $gradle) | Where-Object { $_ -notmatch '^\s*debuggableVariants = \[\]\s*$' } |
  Set-Content $gradle -Encoding utf8

Set-Location (Join-Path $root 'android')
& cmd /c ".\gradlew.bat assembleDebug --no-daemon --console=plain"

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
if (Test-Path $apk) {
  $dist = Join-Path $root 'apk'
  New-Item -ItemType Directory -Force -Path $dist | Out-Null
  Copy-Item $apk (Join-Path $dist 'worktogo-dev.apk') -Force
  $mb = [math]::Round((Get-Item $apk).Length / 1MB, 1)
  Write-Host "APK dev client prêt : $dist\worktogo-dev.apk ($mb Mo)"
  Write-Host "Installe-le UNE fois, puis lance 'npm run dev -- --host' (backend) et 'npm start' (Metro)."
} else {
  Write-Host 'ECHEC : aucun APK produit.'
}
