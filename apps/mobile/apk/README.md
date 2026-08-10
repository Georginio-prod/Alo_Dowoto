# apk/ — APK installable de WorkTogo mobile

C'est ici qu'atterrit l'APK compilé (`worktogo.apk`). Deux façons de le produire.

## Option A — build local (ton PC : SDK + Java déjà présents)
Il ne manque que le **NDK** (composant natif). Une seule fois :
1. Ouvre **Android Studio → Settings → Languages & Frameworks → Android SDK →
   onglet *SDK Tools*** → coche **NDK (Side by side)** et **CMake** → *Apply*.
2. Puis, depuis `apps/mobile/` :
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
   ```
   L'APK debug installable est copié ici en `worktogo.apk`.
   (Ajoute `-Release` pour un build de production signé.)

## Option B — build cloud EAS (aucun outil local requis)
Nécessite un compte Expo gratuit :
```bash
npx expo login
eas build --platform android --profile preview   # renvoie un lien de téléchargement .apk
```

## Pourquoi pas d'APK déjà présent ?
L'environnement d'assistance n'a pas de NDK et ne peut pas l'installer en ligne
de commande (pas de `cmdline-tools`). Les deux commandes ci-dessus produisent un
APK réel en quelques minutes sur ta machine ou sur les serveurs Expo.
