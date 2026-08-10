# assets/

- `images/icon.png`, `splash.png`, `adaptive-icon.png` : **placeholders** (carré
  1×1 vert de marque `#14A800`) pour que `app.config.ts` soit valide et que
  l'app démarre. **À remplacer** par les vraies icônes 1024×1024 dérivées du
  logo WorkTogo (`public/` du site Nuxt) avant tout build de production.
- `fonts/` : Poppins est fournie par `@fontsource/poppins` (chargée via
  expo-font au démarrage). Déposer ici les `.woff2`/`.ttf` si on préfère les
  embarquer localement plutôt que via le paquet.
- `animations/` : fichiers Lottie (confirmation de paiement, mission validée —
  micro-interactions Phase 5).
