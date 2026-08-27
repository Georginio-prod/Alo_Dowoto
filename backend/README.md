# backend/ — API Express d'Alo_Dowoto

API HTTP autonome consommée par **trois clients** : le site web, le dashboard
admin et l'application mobile. Elle est en cours d'**extraction depuis les routes
Nitro** (`server/api/**`) de l'app Nuxt, sous la contrainte absolue du **zéro
changement fonctionnel** — voir `docs/adr/` (ADR-0014/0015/0016) et le filet de
sécurité `tests/contract/`.

> État : **Phase 1 — couche transverse posée** (ADR-0017). L'app démarre à vide
> (sonde `/health`) ; la plomberie réutilisable par tous les domaines est en
> place — **validation Zod** (bridge + primitives), **doc OpenAPI** (`/api/docs`),
> patron **services/ + repositories/** découplé de Nitro. Aucune route métier
> n'est encore portée (Phase 2).

## Structure

```
src/
  config/        env + fabrique de l'app Express (server.ts)
  routes/        routeurs Express (montage des endpoints)
  controllers/   handlers de requête (parse → appelle le service → formate)
  services/      logique métier (portée depuis server/utils/*Store + services)
  repositories/  accès données (Prisma)
  validation/
    primitives.ts  briques Zod partagées (requiredTrimmed…), agnostiques du framework
    validate.ts    pont schéma → route (parseSchema / validateBody / validateQuery), 400 iso Nitro
    schemas/       schémas Zod par domaine (repris de server/utils/apiValidation*, Phase 2)
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

cp backend/.env.example backend/.env   # DATABASE_URL → base partagée `worktogo` (port 5433)
npm install                            # workspaces : installe app + backend, mutualise les deps
npm --prefix backend run prisma:generate   # génère le client (schéma backend/prisma)
npm --prefix backend run prisma:migrate    # applique/crée les migrations (le backend en est propriétaire)
npm --prefix backend run dev               # tsx watch, http://localhost:3001/health  (·/health/db)
```

> **Prisma appartient au backend** (ADR-0017) : schéma, migrations et config dans
> `backend/prisma/`. Grâce aux **workspaces npm**, le client généré est mutualisé
> (hoisté) et l'app l'importe tant que les routes Nitro subsistent. Depuis la
> racine, `npm run db:generate` / `db:migrate` délèguent au backend.

Build de production :

```bash
npm run build && npm start
```

## Conventions clés (fidélité au contrat)

- **Format d'erreur identique à Nitro** : `{ error: true, statusCode, message, data }`.
  Toujours lever une `HttpError` (`src/utils/apiError.ts`) — jamais un
  `res.status().json()` d'erreur ad hoc.
- **Multi-clients** : CORS `credentials: true`, liste blanche via `CORS_ORIGINS`.
- **Validation** : un schéma zod par payload, branché sur la route via
  `validateBody`/`parseSchema` (`src/validation/validate.ts`) — premier message
  du schéma → 400, iso `readSchemaBody` Nitro. Les schémas composent les
  primitives partagées (`src/validation/primitives.ts`).
- **Couches** : `routes → controllers → services → repositories`. Seuls les
  **repositories** parlent à Prisma (client injecté, testables sans base) ; les
  **services** portent la logique métier, sans dépendance framework (ADR-0015).
- **Doc OpenAPI** : annotations `@openapi` en JSDoc au-dessus des routes, servies
  sur **`/api/docs`** (UI) et `/api/docs.json` (spec). Exposée hors prod par
  défaut (`API_DOCS_ENABLED`).
- **Base : PostgreSQL `worktogo`** (conteneur Docker, `docker-compose.yml`
  racine, port **5433**, ADR-0015). **Le backend est propriétaire de Prisma** :
  schéma, migrations et config dans **`backend/prisma/`** (ADR-0017). Le client
  généré est mutualisé via les **workspaces npm** — l'app l'importe tant que les
  routes Nitro subsistent. Migrations : `npm run prisma:migrate` (depuis `backend/`).
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
- ESLint/Prettier propres au sous-projet.
- ✅ **Doc OpenAPI** (Swagger) : `/api/docs`, générée depuis les annotations
  `@openapi` des routes (`src/config/swagger.ts`).
- Migration domaine par domaine, chaque domaine validé par `tests/contract`.
- Convergence de la base : migration de l'app Nuxt SQLite → PostgreSQL (étape
  dédiée, avec cutover prod sous contrôle de l'équipe).
