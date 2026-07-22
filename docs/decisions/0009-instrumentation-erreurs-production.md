# ADR 0009 — Instrumentation d'erreurs en production

**Statut :** Adopté pour la partie technique ; **décision produit/infra en attente** pour le fournisseur (2026-07-21)
**Contexte :** issue #262 (« Instrumentation d'erreurs en production (Sentry ou équivalent) »)

## Contexte

Aucune visibilité n'existait sur les erreurs réelles en production : une
exception non gérée côté serveur (ex. dans un handler de paiement) ou une
erreur front silencieuse ne remontait nulle part, seul un utilisateur qui se
plaint (ou pas) permettant de le savoir — un manque particulièrement
sensible pour un produit qui manipule de l'argent (paiement mobile money,
séquestre).

## Ce qui est fait (cette PR)

- `server/utils/errorReporting.ts` : `initServerErrorReporting()` /
  `captureServerError()`, construits sur `@sentry/node`. Entièrement inerte
  tant que `SENTRY_DSN` n'est pas défini — aucun appel réseau, pas de
  dépendance à un compte externe pour que le reste de l'application
  fonctionne.
- `server/plugins/errorReporting.ts` : hook d'erreur Nitro
  (`nitroApp.hooks.hook('error', ...)`), qui couvre l'ensemble de
  `server/api/**` — un périmètre plus large que le minimum demandé par
  l'issue (routes de paiement/séquestre/webhook), qui les inclut donc
  naturellement sans ciblage manuel route par route.
- `app/plugins/errorReporting.client.ts` : construit sur `@sentry/browser`,
  capture les erreurs Vue non gérées via `app.config.errorHandler`. Inerte
  tant que `NUXT_PUBLIC_SENTRY_DSN` n'est pas défini.
- Scrubbing (`scrubSensitiveData`, testé dans
  `tests/errorReporting.test.ts`) : retire avant tout envoi les champs
  nommés `contact`/`phone`/`telephone`/`password`/`passwordHash`/`token`/
  `secret`/`idCardImage`/`passportPhotoImage`/`operatorRef` (insensible à la
  casse), et redacte tout numéro de téléphone glissé dans un champ texte
  libre non listé (ex. une description). Répond directement à l'exigence de
  l'issue : ne jamais logger de numéros bruts, de secrets, ou de contexte
  identifiant sensible.
- `.env.example` documente `SENTRY_DSN` / `NUXT_PUBLIC_SENTRY_DSN`.

## Ce qui reste un choix produit/infra (hors périmètre de ce correctif)

L'issue documente elle-même ce blocage (« Bloquant externe ») : la création
d'un compte/projet chez un fournisseur ne peut pas être faite en passant,
sans arbitrage produit. Ce document consigne une recommandation par défaut
plutôt que de la décider unilatéralement :

- **Recommandation : Sentry** (SDK déjà intégré ici, `@sentry/node` +
  `@sentry/browser`) — offre gratuite suffisante pour démarrer, éditeur de
  référence du marché, la plus large communauté de retours d'expérience.
- **Alternative auto-hébergée : GlitchTip** — API compatible avec les SDK
  Sentry (aucun changement de code nécessaire, seul le DSN change), pertinent
  si la donnée ne doit pas transiter par un tiers hébergé hors Togo/UEMOA.
- Une fois le fournisseur choisi : créer le compte/projet, renseigner
  `SENTRY_DSN`/`NUXT_PUBLIC_SENTRY_DSN` dans l'environnement de production
  (jamais committés), puis vérifier concrètement qu'une erreur provoquée
  remonte bien dans l'outil (dernier critère d'acceptation de l'issue,
  seulement vérifiable une fois un compte réel configuré).

## Critères d'acceptation de l'issue — état

- [ ] Fournisseur choisi et compte créé — **en attente d'arbitrage
      produit/infra**, recommandation ci-dessus.
- [x] Erreurs serveur non gérées capturées (hook Nitro global, couvre au
      minimum les routes de paiement/escrow/webhook demandées).
- [x] Erreurs front non gérées capturées (`app.config.errorHandler`).
- [ ] Vérifié en environnement de test — **nécessite le compte réel
      ci-dessus**, non simulable sans DSN valide.
