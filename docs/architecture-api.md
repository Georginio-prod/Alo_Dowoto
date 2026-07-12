# Architecture de l'API backend (#46)

## Décision : Nitro server routes intégrées au projet Nuxt

L'API WorkTogo est implémentée avec les **routes serveur Nitro** de Nuxt
(`server/api/`), et non comme un service backend séparé (Node/Express,
NestJS, etc.).

C'est déjà l'approche suivie par toutes les routes existantes (`#23` OTP,
`#24` session, `#27` profil prestataire, `#30` abonnements, `#34`
paiements) — ce document formalise et justifie ce choix implicite, et fixe
les conventions pour les routes à venir (`#43` recherche prestataires,
etc.).

### Justification

| Critère | Nitro server routes (choisi) | Service séparé |
|---|---|---|
| Déploiement | Un seul build, une seule cible de déploiement | Deux services à builder/déployer/versionner séparément |
| Partage de types | Types TypeScript partagés nativement entre `app/` et `server/` (ex. `app/data/sectors.ts`, `app/data/plans.ts` déjà importés côté serveur) | Duplication de types ou package partagé à maintenir |
| Latence interne | Appels intra-process | Appel réseau supplémentaire |
| Complexité d'infra | Aucune (même Node process) | Reverse proxy, CORS, découverte de service, déploiement indépendant |
| Scalabilité indépendante API/front | Non — API et rendu scalent ensemble | Oui |
| Taille de l'équipe / du projet | Adapté (équipe réduite, un seul repo) | Se justifie à partir d'une charge/équipe plus importante |

Le projet est une équipe réduite avec un seul frontend consommateur de
l'API (pas de besoin de scaling indépendant ni de réutilisation de l'API
par d'autres clients à ce stade) : la simplicité de déploiement et le
partage de types l'emportent largement sur les bénéfices d'une séparation
des responsabilités, qui resterait de toute façon possible plus tard car
Nitro isole déjà la logique métier dans `server/utils/*Store.ts`
(indépendante du framework HTTP).

## Structure de dossiers

```
server/
  api/
    auth/
      otp/
        send.post.ts       # POST /api/auth/otp/send
        verify.post.ts     # POST /api/auth/otp/verify
      session.get.ts        # GET/DELETE/POST /api/auth/session
      session.post.ts
      session.delete.ts
    providers/
      me.get.ts             # GET/PATCH /api/providers/me
      me.patch.ts
      search.get.ts         # GET /api/providers/search (#43)
    subscriptions/
      index.post.ts         # POST /api/subscriptions
      me.get.ts              # GET /api/subscriptions/me
    payments/
      initiate.post.ts       # POST /api/payments/initiate
      webhook.post.ts        # POST /api/payments/webhook
      [id].get.ts             # GET /api/payments/:id
  utils/
    apiError.ts             # helpers d'erreurs HTTP centralisés
    requireSessionUser.ts   # garde d'authentification / rôle
    userStore.ts            # store en mémoire (#45 : futur remplacement DB)
    providerStore.ts
    subscriptionStore.ts
    paymentStore.ts
    otpStore.ts
    contact.ts
    webhookSignature.ts
```

**Convention :** une route par fichier, nommée `<segment>.<méthode>.ts`
(convention Nitro). La logique métier (validation profonde, mutations)
vit dans `server/utils/*Store.ts`, jamais directement dans le handler de
route — un handler ne fait que : authentifier/autoriser, valider la
requête, appeler le store, retourner `{ <ressource>: valeur }`.

## Gestion d'erreurs centralisée

### Ce que fournit déjà Nitro/Nuxt

Toute requête vers `/api/**` est détectée comme une requête JSON (voir
`isJsonRequest` dans le runtime Nuxt). Une erreur non interceptée y répond
donc **toujours** avec la même forme JSON, y compris pour les erreurs
inattendues (non levées explicitement via `createError`) :

```json
{
  "error": true,
  "url": "https://.../api/providers/me",
  "statusCode": 403,
  "statusMessage": "Réservé aux comptes prestataire.",
  "message": "Réservé aux comptes prestataire.",
  "data": undefined
}
```

Ce comportement est fourni gratuitement par le framework — il n'y a rien
à configurer pour l'obtenir. Ce qui manquait était la **cohérence côté
appelant** (chaque route dupliquait `createError({ statusCode,
statusMessage })` avec son propre vocabulaire).

### Ce que ce lot ajoute : `server/utils/apiError.ts`

Des helpers sémantiques, auto-importés (convention Nitro), remplacent les
appels directs à `createError` dans toutes les routes existantes :

```ts
badRequest(message, data?)   // 400
unauthorized(message?)        // 401
forbidden(message?)           // 403
notFound(message)             // 404
conflict(message)             // 409
tooManyRequests(message, data?) // 429
```

`server/utils/requireSessionUser.ts` expose en plus `requireProviderRole(event)`,
qui factorise la vérification « connecté + rôle prestataire » répétée dans
la plupart des routes `/api/providers`, `/api/subscriptions` et
`/api/payments`.

### Routes couvertes par cette passe

`#23` (`auth/otp/*`), `#24` (`auth/session*`), `#27`
(`providers/me.*`), `#30` (`subscriptions/*`), `#34` (`payments/*`). Les
nouvelles routes (`#43` et suivantes) doivent utiliser ces mêmes helpers
plutôt que `createError` directement.

## Critères d'acceptation (#46)

- [x] Choix d'architecture documenté (voir « Décision » et « Justification » ci-dessus)
- [x] Structure de dossiers en place (voir « Structure de dossiers »)
- [x] Gestion d'erreurs centralisée — format de réponse cohérent pour toutes les routes listées (#23, #24, #27, #30, #34), prêt pour #43
