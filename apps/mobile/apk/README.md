# apk/ — APK de WorkTogo mobile

Deux APK possibles selon l'usage. Les `.apk` ne sont pas versionnés (trop lourds).

## 🔁 `worktogo-dev.apk` — développement, rechargement AUTOMATIQUE (recommandé)
À **installer une seule fois**. Il ne fige pas le code JS : il le charge en
direct depuis le serveur **Metro** de ton PC. Résultat : **toute modif JS/TS
(écrans, logique, styles, textes) s'applique instantanément** (Fast Refresh),
**sans réinstaller**.

**Construire** (une fois) :
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-devclient.ps1
```
Installe `worktogo-dev.apk` sur le téléphone.

**Utiliser (chaque jour)** — téléphone et PC sur le même Wi‑Fi :
```bash
# 1) backend (dans Alo_Dowoto)
npm run dev -- --host
# 2) Metro (dans apps/mobile)
npm start
```
Ouvre l'app **« WorkTogo (dev) »** → elle se connecte à Metro et recharge à
chaque sauvegarde. Secoue le téléphone pour le menu dev (recharger, etc.).

> Pare-feu Windows : autorise aussi le **port 8081** (Metro), en plus du 3000.
> Réinstaller UNIQUEMENT si tu ajoutes un **module natif** ou changes la partie
> native de `app.config.ts` (permissions, plugins). Le JS ne compte pas.

## 📦 `worktogo.apk` — autonome, à partager/tester sans PC
Le bundle JS est figé dedans → fonctionne **sans Metro ni PC**, mais **chaque
modif exige de reconstruire + réinstaller**. À utiliser pour distribuer une
version, pas pour développer.
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
```
- Paquet `com.worktogo.mobile`, signé debug, ~183 Mo (universel).

## Installer un APK
- Transfert : copie le `.apk` sur le téléphone et ouvre-le (autoriser « sources
  inconnues »).
- Câble :
  ```powershell
  & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r apk/worktogo-dev.apk
  ```

## Configuration réseau
- Backend visé via `EXPO_PUBLIC_API_URL` dans `.env` (ex.
  `http://192.168.1.174:3000`). En mode dev client, changer `.env` suffit
  (Metro ré-inline la valeur au rechargement) — pas de rebuild.
- APK plus léger (Release minifié) : voir « chemin court » ou EAS cloud plus bas.

## Obtenir un APK Release léger (~40–70 Mo)
Le build Release échoue sur ce poste (limite Windows 260 c. du codegen). Options :
`eas build -p android --profile preview` (cloud), ou build depuis un chemin court.

## Toolchain
NDK r27b (27.1.12297006) + CMake 3.22.1 installés via `sdkmanager`.
