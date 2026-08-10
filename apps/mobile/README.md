# WorkTogo Mobile (React Native + Expo)

Application mobile WorkTogo / Alo Dowoto reconstruite en **React Native + Expo
(TypeScript strict)**, en remplacement de la coquille Capacitor qui chargeait le
web Nuxt. Backend **inchangé** (site Nuxt, ports 3001/3002) — voir
[`MIGRATION.md`](./MIGRATION.md) pour le contrat d'API et la table de parité.

## Démarrer, tester, compiler (3 lignes)

```bash
npm install            # depuis apps/mobile/ ; puis copier .env.example -> .env
npm start              # serveur de dev Expo sur le port 3000
eas build --platform android --profile preview   # APK réel (compte Expo requis)
```

Vérifications : `npm run typecheck` · `npm run lint` · `npm test`.

## Architecture (par fonctionnalité)

- `app/` — routes expo-router : `(auth)`, `(chercheur)`, `(prestataire)`, écrans
  partagés (`mission/[id]`, `notifications`, `legal/[slug]`…).
- `src/design-system/` — jetons (source de vérité unique) + composants de base.
- `src/features/<f>/` — `api.ts` · `hooks.ts` · `types.ts` · `utils.ts`. Aucune
  logique métier dans un écran, aucun appel réseau hors d'un hook.
- `src/services/` — client HTTP (cookie `wt_session`, retry, timeout 15 s),
  stockage sécurisé, réseau, TanStack Query, Sentry, géolocalisation.
- `src/i18n/` — français par défaut, anglais en repli.

## Règles tenues
TypeScript strict · un seul style de bouton · 4 onglets max avec libellés ·
4 états par écran (chargement/contenu/vide/erreur) · aucune couleur ni chaîne en
dur dans les écrans · Android 8+ (API 26) · Hermes + nouvelle architecture.
