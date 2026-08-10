# apk/ — APK installable de WorkTogo mobile

## ✅ `worktogo.apk` — construit et prêt
Un APK **autonome** (le bundle JS est embarqué, il fonctionne **sans serveur
Metro**) a été généré ici : `worktogo.apk`.

- Paquet : `com.worktogo.mobile` · signé avec la clé debug · toutes ABIs
  (arm64-v8a, armeabi-v7a, x86, x86_64).
- Poids : ~183 Mo (build **debug**, universel, non minifié — volumineux mais
  installable et fonctionnel ; voir plus bas pour un APK plus léger).
- Le fichier `.apk` n'est pas versionné dans git (trop lourd, `.gitignore`).

### Installer sur un téléphone
- **Par transfert** : copie `worktogo.apk` sur le téléphone (câble, Drive,
  WhatsApp…), ouvre-le, autorise « installer depuis des sources inconnues ».
- **Par câble (adb)** :
  ```powershell
  & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r apk/worktogo.apk
  ```
- Au premier lancement, l'app appelle le backend défini par
  `EXPO_PUBLIC_API_URL` (`.env`). Sur un vrai téléphone, mets l'IP LAN du PC
  qui fait tourner le site Nuxt (ex. `http://192.168.1.20:3001`).

## Reconstruire
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
```
Le script détecte Java (JBR) + le SDK, lance `expo prebuild`, embarque le bundle
JS dans la variante Debug, compile, et recopie l'APK ici.

## Obtenir un APK plus léger (Release minifié, ~40–70 Mo)
Le build **Release** échoue sur ce poste à cause de la limite Windows des
chemins > 260 caractères (fichiers C++ du codegen nouvelle archi). Deux
solutions :
1. **Chemin court** : construire depuis une jonction courte
   ```powershell
   cmd /c mklink /J C:\w "<...>\apps\mobile"
   cd C:\w\android ; .\gradlew.bat assembleRelease
   ```
   (réduit la longueur des chemins ; à tester selon la profondeur exacte).
2. **EAS cloud** (aucune contrainte locale) :
   ```bash
   npx expo login ; eas build -p android --profile preview
   ```
   Renvoie un lien de téléchargement d'un APK Release optimisé.

## Historique
NDK r27b (27.1.12297006) + CMake 3.22.1 installés via `sdkmanager` ; toolchain
compilée avec succès pour les 4 ABIs.
