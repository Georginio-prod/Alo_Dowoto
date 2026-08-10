# Construit un APK WorkTogo AUTONOME (installable sans serveur Metro) et le
# copie dans apk/worktogo.apk.
#
# Prérequis (une seule fois) : Android Studio > SDK Manager > SDK Tools >
#   cocher "NDK (Side by side)" + "CMake". Java (JBR) et le SDK sont détectés
#   automatiquement.
#
# Note Windows : le build Release échoue sur les chemins CMake > 260 caractères
# (codegen nouvelle archi). On produit donc un APK Debug avec le bundle JS
# embarqué (variante autonome). Pour un APK Release plus léger (minifié, splits
# d'ABI), voir apk/README.md (build depuis un chemin court, ou EAS cloud).
#
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot   # apps/mobile

# --- Outillage (détecté) ---
$jbr = 'C:\Program Files\Android\Android Studio\jbr'
if (Test-Path $jbr) { $env:JAVA_HOME = $jbr }
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdk) { $env:ANDROID_HOME = $sdk; $env:ANDROID_SDK_ROOT = $sdk }
$env:NODE_ENV = 'production'   # requis par le bundling Expo

# Charge les variables EXPO_PUBLIC_* de .env dans l'environnement du process,
# pour qu'elles soient inlinées de façon fiable par Metro pendant le bundling
# Gradle (le simple .env n'est pas toujours lu à cette étape).
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*(EXPO_PUBLIC_[A-Z0-9_]+)\s*=\s*(.+?)\s*$') {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
  }
}
Write-Host "JAVA_HOME=$env:JAVA_HOME`nANDROID_HOME=$env:ANDROID_HOME`nEXPO_PUBLIC_API_URL=$env:EXPO_PUBLIC_API_URL"

Set-Location $root
if (-not (Test-Path 'node_modules')) { npm install }

# Génère android/ (écrase les modifs manuelles précédentes).
npx expo prebuild --platform android --no-install

# Patch : embarquer le bundle JS dans la variante Debug (défaut = exclue).
# Rend l'APK Debug autonome (fonctionne sans Metro).
$gradle = Join-Path $root 'android\app\build.gradle'
$txt = Get-Content $gradle -Raw
if ($txt -notmatch 'debuggableVariants\s*=\s*\[\]') {
  $txt = $txt -replace '(bundleCommand = "export:embed")', "`$1`n    debuggableVariants = []"
  Set-Content $gradle $txt -Encoding utf8
  Write-Host 'Patch debuggableVariants = [] appliqué.'
}

Set-Location (Join-Path $root 'android')
& cmd /c ".\gradlew.bat assembleDebug --no-daemon --console=plain"

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
if (Test-Path $apk) {
  $dist = Join-Path $root 'apk'
  New-Item -ItemType Directory -Force -Path $dist | Out-Null
  Copy-Item $apk (Join-Path $dist 'worktogo.apk') -Force
  $mb = [math]::Round((Get-Item $apk).Length / 1MB, 1)
  Write-Host "APK autonome prêt : $dist\worktogo.apk ($mb Mo)"
} else {
  Write-Host 'ECHEC : aucun APK produit (voir la sortie Gradle ci-dessus).'
}
