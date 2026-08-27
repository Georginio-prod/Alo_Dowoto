# backend/ — API Express d'Alo_Dowoto

API HTTP autonome consommée par **trois clients** : le site web, le dashboard
admin et l'application mobile. Elle est en cours d'**extraction depuis les routes
Nitro** (`server/api/**`) de l'app Nuxt, sous la contrainte absolue du **zéro
changement fonctionnel** — voir `docs/adr/` (ADR-0014/0015/0016) et le filet de
sécurité `tests/contract/`.

> État : **Phase 1 — squelette**. L'app démarre à vide (sonde `/health`), la
> plomberie transverse est posée, aucune route métier n'est encore portée.

## Structure

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
cp .env.example .env       # DATABASE_URL pointe sur la base partagée `worktogo` (port 5433)
npm install
npm run prisma:generate    # génère le client Prisma (le backend ne migre PAS la base)
npm run dev                # tsx watch, http://localhost:3001/health  (·/health/db pour la base)
```

> Le **schéma de la base `worktogo` est géré par l'app Nuxt** (ses migrations
> Prisma). Lance d'abord les migrations de l'app (`npm run db:migrate` à la
> racine) : le backend ne fait que **générer son client** et interroger les
> tables existantes — il ne doit **jamais** `db push` / `migrate` la base
> partagée (il droperait les tables de l'app).

Build de production :

```bash
npm run build && npm start
```

## Conventions clés (fidélité au contrat)

- **Format d'erreur identique à Nitro** : `{ error: true, statusCode, message, data }`.
  Toujours lever une `HttpError` (`src/utils/apiError.ts`) — jamais un
  `res.status().json()` d'erreur ad hoc.
- **Multi-clients** : CORS `credentials: true`, liste blanche via `CORS_ORIGINS`.
- **Base : PostgreSQL partagée `worktogo`** (conteneur Docker, `docker-compose.yml`
  racine, port **5433**, ADR-0015), **propriété de l'app Nuxt** (schéma +
  migrations). Le backend a un schéma **subset** (`backend/prisma/schema.prisma`,
  actuellement `User` + `Session`) utilisé **uniquement pour générer son client**
  et interroger les tables — jamais pour migrer/push la base partagée. Les modèles
  du subset s'ajoutent domaine par domaine au portage.
- **Tests isolés** : les tests backend tournent contre une base dédiée
  `worktogo_backend_test` (préparée par `vitest.globalSetup.ts`), jamais contre
  `worktogo`.

## Reste à faire (prochaines briques)

- ✅ **Couche auth transverse** : gardes `requireSessionUser` / `requireProviderRole`
  / `requireClientRole` / `requireAdminRole` (`src/middleware/auth.ts`), cookie
  `wt_session` + Bearer, expiration/suspension, mêmes codes et messages que Nitro
  (vérifié contre Postgres, `src/middleware/__tests__/auth.test.ts`).
  > ⚠️ Ces gardes interrogent la base **du backend** (Postgres). Les sessions
  > réelles des utilisateurs vivent encore dans la base **SQLite de l'app** :
  > l'auth n'authentifiera les vrais comptes qu'**après la convergence des bases**.
- Workflows CI par section (`backend-code-quality.yml`, `backend-vitest.yml`).
- ESLint/Prettier propres au sous-projet ; Swagger.
- Migration domaine par domaine, chaque domaine validé par `tests/contract`.
- Convergence de la base : migration de l'app Nuxt SQLite → PostgreSQL (étape
  dédiée, avec cutover prod sous contrôle de l'équipe).
