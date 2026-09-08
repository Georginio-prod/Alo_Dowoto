# API WorkTogo

Backend Express autonome de WorkTogo. Il est l'unique propriétaire de la
logique métier, du schéma Prisma et des migrations PostgreSQL.

## Structure

```text
src/
  routes/         définition HTTP et middleware d'autorisation
  controllers/    adaptation HTTP (entrée/sortie)
  services/       règles métier
  repositories/   accès Prisma injecté et testable
  validation/     schémas Zod
  data/           référentiels communs au front et à l'API
  config/         environnement, Prisma et serveur Express
prisma/           schéma et migrations PostgreSQL
scripts/          seed et création d'administrateur
```

Les routes sont montées sous `/api`; la documentation OpenAPI est disponible
sur `/api/docs` hors production par défaut. Les erreurs respectent le format
commun `{ error, statusCode, message, data }`.

## Développement

Depuis la racine du dépôt :

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env
npm ci
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run dev
```

L'API écoute par défaut sur <http://localhost:3001>; son état est exposé sur
`/health` et `/health/db`.

## Migrations

Les migrations versionnées dans `prisma/migrations/` sont la seule façon de
modifier le schéma partagé.

```bash
# appliquer une base existante (CI, Docker, production)
npm run prisma:deploy

# créer une migration pendant le développement, après modification du schéma
npm run prisma:migrate -- --name description_du_changement
```

N'utilisez `prisma:push` que pour une base de test jetable. Les tests backend
préparent leur base isolée avec cette commande; la base applicative n'est jamais
réinitialisée.

## Tests et qualité

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` requiert PostgreSQL. Par défaut, il cible
`worktogo_backend_test` sur le port 5433, ou `TEST_DATABASE_URL` si elle est
définie.

## Scripts opérationnels

```bash
npm run prisma:seed
npm run admin:create -- admin@worktogo.tg 'MotDePasseFort!'
```

Le seed est idempotent et prévu pour une base de démonstration, jamais pour une
base de production.
