# Architecture API

## Vue d'ensemble

```text
Navigateur
    │  /api/** (même origine, cookie wt_session)
    ▼
nginx (web statique + reverse proxy)
    ▼
Express API ─── Prisma ─── PostgreSQL
```

Nuxt est une SPA statique (`ssr: false`) : il ne possède ni routes API, ni
connexion base de données, ni secrets. Le reverse proxy conserve une seule
origine publique; CORS reste utile uniquement aux clients mobiles ou desktop
qui contactent Express directement.

## Organisation du backend

Une requête traverse les couches suivantes :

```text
route → validation/middleware → controller → service → repository → Prisma
```

- Une **route** déclare le verbe, le chemin, la garde et le schéma Zod.
- Un **controller** lit la requête, appelle le service et forme la réponse HTTP.
- Un **service** porte les règles métier et n'accède pas directement à Express.
- Un **repository** est le seul accès aux modèles Prisma; il reçoit son client
  en injection, ce qui rend les tests indépendants du transport HTTP.

Les erreurs sont levées avec `HttpError` et formatées une seule fois par le
middleware final : `{ error, statusCode, message, data }`.

## Authentification et clients

Le web utilise le cookie `wt_session`, posé `httpOnly`, `sameSite=lax` et
`secure` en production. Les applications mobile et desktop peuvent utiliser
un Bearer token. Les gardes relisent l'utilisateur depuis PostgreSQL et
refusent les sessions expirées ou suspendues.

## Contrats partagés

Le front réexporte ses DTO depuis [`app/types/api.ts`](../app/types/api.ts).
Ce sont des imports de type uniquement : aucun code Express ou Prisma n'est
chargé dans le bundle web. Les données de référence communes (secteurs, régions
et rayons) vivent dans `backend/src/data/`; Nuxt les lit via l'alias
`#domain-data`.

## Documentation et santé

- `GET /health` : disponibilité du processus.
- `GET /health/db` : vérification PostgreSQL.
- `GET /api/docs` et `GET /api/docs.json` : OpenAPI, activés hors production
  par défaut (configurable avec `API_DOCS_ENABLED`).

## Tests

Les tests unitaires de l'interface vivent à la racine. Les tests d'intégration
HTTP et métier vivent dans `backend/src/**/__tests__` et s'exécutent sur une
base PostgreSQL dédiée. Les parcours Playwright démarrent les deux processus
(Nuxt + Express) et passent par le proxy `/api`, comme un navigateur réel.
