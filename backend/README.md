# backend/ — API Express d'Alo_Dowoto

API HTTP autonome consommée par **trois clients** : le site web, le dashboard
admin et l'application mobile. Elle est en cours d'**extraction depuis les routes
Nitro** (`server/api/**`) de l'app Nuxt, sous la contrainte absolue du **zéro
changement fonctionnel** — voir `docs/adr/` (ADR-0014/0015/0016) et le filet de
sécurité `tests/contract/`.

> État : **Phase 1 — squelette**. L'app démarre à vide (sonde `/health`), la
> plomberie transverse est posée, aucune route métier n'est encore portée.

## Structure (modèle cnc-portal)

```
src/
  config/        env + fabrique de l'app Express (server.ts)
  routes/        routeurs Express (montage des endpoints)
  controllers/   handlers de requête (parse → appelle le service → formate)
  services/      logique métier (portée depuis server/utils/*Store + services)
  repositories/  accès données (Prisma)
  validation/
    schemas/     schémas Zod (repris de server/utils/apiValidation*)
  middleware/    auth, erreurs, 404…
  utils/         helpers transverses (apiError…)
  types/         types partagés
  index.ts       point d'entrée (écoute + arrêt gracieux)
  instrument.ts  Sentry (importé en premier)
```

## Démarrer

```bash
# Depuis la racine du dépôt : démarrer la base PostgreSQL (conteneur Docker)
docker compose up -d postgres

cd backend
cp .env.example .env       # DATABASE_URL pointe déjà sur le conteneur (port 5433)
npm install
npm run prisma:generate    # génère le client Prisma
npm run prisma:push        # crée le schéma dans la base (aucun modèle pour l'instant)
npm run dev                # tsx watch, http://localhost:3001/health  (·/health/db pour la base)
```

Build de production :

```bash
npm run build && npm start
```

## Conventions clés (fidélité au contrat)

- **Format d'erreur identique à Nitro** : `{ error: true, statusCode, message, data }`.
  Toujours lever une `HttpError` (`src/utils/apiError.ts`) — jamais un
  `res.status().json()` d'erreur ad hoc.
- **Multi-clients** : CORS `credentials: true`, liste blanche via `CORS_ORIGINS`.
- **Base : PostgreSQL** (conteneur Docker, `docker-compose.yml` racine, port
  **5433**, ADR-0015). Le backend a son propre schéma
  (`backend/prisma/schema.prisma`), **sans modèle pour l'instant** — les modèles
  sont ajoutés domaine par domaine au portage. L'app Nuxt reste sur SQLite tant
  qu'elle n'a pas migré (étape séparée).

## Reste à faire (prochaines briques)

- Workflows CI par section (`backend-code-quality.yml`, `backend-vitest.yml`).
- ESLint/Prettier propres au sous-projet.
- Couche transverse : auth (cookie + Bearer, iso `requireSessionUser`), Swagger.
- Migration domaine par domaine, chaque domaine validé par `tests/contract`.
- Convergence de la base : migration de l'app Nuxt SQLite → PostgreSQL (étape
  dédiée, avec cutover prod sous contrôle de l'équipe).
