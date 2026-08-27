# WorkTogo (Alo Dowoto)

Place de marché de services togolaise mettant en relation des **clients**
(chercheurs de prestations) et des **prestataires** (ménage, plomberie,
électricité, maçonnerie, menuiserie, peinture, jardinage, climatisation…).

Le cœur du produit est un **paiement en séquestre (escrow)** avec portefeuille
interne : le client alimente son solde par mobile money, paie une prestation
(fonds bloqués), et les fonds ne sont libérés vers le prestataire qu'après double
validation (ou 72 h de validation tacite), avec commission plateforme,
remboursement et gestion de litige.

## Architecture (en un coup d'œil)

Le dépôt contient **deux applications** :

| Dossier    | Rôle                                                                 | Techno                          | Port |
| ---------- | -------------------------------------------------------------------- | ------------------------------- | ---- |
| `app/` + `server/` | Front SSR **et** API interne (routes Nitro `server/api/**`)   | Nuxt 4, Vue 3, Nitro, TypeScript | 3000 |
| `backend/` | API HTTP autonome, **en cours d'extraction** depuis les routes Nitro | Express, TypeScript, Prisma      | 3001 |

> **Où en est le chantier ?** L'API est aujourd'hui servie par **Nitro**
> (`server/api/**`). On l'extrait progressivement vers `backend/` (Express),
> domaine par domaine, **sans changement de comportement** — voir
> [`docs/adr/`](docs/adr/README.md) (ADR-0014 à 0016) et le filet
> [`tests/contract/`](tests/contract/README.md). Tant qu'un domaine n'est pas
> basculé, c'est Nitro qui répond : **l'app fonctionne normalement sans le backend**.

## Prérequis

- **Node.js 22** et **npm**
- **Docker** + **Docker Compose** (pour la base PostgreSQL du backend)

## Démarrage rapide

### 1. L'application (Nuxt + API Nitro) — suffit pour lancer le site

```bash
npm install                 # dépendances de l'app
cp .env.example .env         # puis renseigner les valeurs locales
npm run db:migrate           # base SQLite de dev + client Prisma
npm run dev                  # http://localhost:3000
```

À ce stade, **le site tourne entièrement** (front + API Nitro + base SQLite).
Les étapes 2 et 3 ne sont nécessaires que pour travailler sur le nouveau backend.

### 2. La base PostgreSQL (Docker) — pour le backend

```bash
docker compose up -d postgres     # démarre PostgreSQL (port hôte 5433)
# Adminer (UI web de la base) : http://localhost:8080
#   Système : PostgreSQL · Serveur : postgres · Utilisateur/mot de passe/base : worktogo
docker compose down               # arrêter (les données persistent dans le volume)
```

### 3. Le backend Express (en extraction)

```bash
cd backend
cp .env.example .env         # DATABASE_URL pointe déjà sur le conteneur (port 5433)
npm install
npm run prisma:generate      # génère le client Prisma
npm run prisma:push          # applique le schéma à la base (aucun modèle pour l'instant)
npm run dev                  # http://localhost:3001/health  (et /health/db pour la base)
```

## Bases de données (état transitoire)

- **App Nuxt → SQLite** (`prisma/schema.prisma`, `DATABASE_URL="file:./dev.db"`).
  Inchangé, l'app l'utilise encore.
- **Backend → PostgreSQL** (conteneur Docker, `backend/prisma/schema.prisma`).
  Postgres gère les écritures concurrentes des trois clients (web, dashboard,
  mobile), contrairement à SQLite.

À terme, l'app migrera aussi vers PostgreSQL et les deux partageront la même base
(étape dédiée, sous contrôle de l'équipe — cf.
[ADR-0015](docs/adr/0015-partage-logique-metier-et-donnees.md)).

## Point de bascule front → backend

Tous les appels API du front passeront par `useApi().apiFetch('/api/...')`
([`app/composables/useApi.ts`](app/composables/useApi.ts)), qui aiguille chaque
requête vers Nitro (défaut) ou le backend Express **par domaine**, via deux
variables **vides par défaut** (donc aucun changement) :

```bash
NUXT_PUBLIC_BACKEND_BASE_URL=https://api.worktogo.example   # URL du backend
NUXT_PUBLIC_MIGRATED_API_PREFIXES=/api/auth,/api/wallet     # domaines déjà portés (CSV)
```

Ajouter un préfixe bascule ce domaine vers le backend ; le retirer revient
instantanément à Nitro (rollback sans redéploiement).

## Tests

```bash
# App (racine)
npm test                 # unitaires Vitest (dont tests/http/** et tests/contract/**)
npm run test:e2e         # parcours Playwright (vraie instance Nuxt, base SQLite jetable)

# Backend
npm --prefix backend test   # Vitest (santé + connexion Prisma si Postgres démarré)
```

Le harnais [`tests/contract/`](tests/contract/README.md) fige le comportement de
l'API Nitro actuelle et sera rejoué contre le backend pour garantir l'iso-fonctionnement.

## Scripts principaux

| Commande (racine) | Rôle |
| --- | --- |
| `npm run dev` / `build` / `preview` | Dev / build de prod / prévisualisation |
| `npm run lint` / `lint:fix` / `lint:md` | ESLint (règle des 300 lignes) / markdownlint |
| `npm run typecheck` | Vérification de types (`nuxt typecheck`) |
| `npm test` / `test:e2e` | Tests unitaires / de parcours |
| `npm run db:migrate` / `db:generate` / `db:studio` / `db:seed` | Prisma (dev SQLite) |

| Commande (`backend/`) | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev (tsx watch) / build tsc / lancer le build |
| `npm run typecheck` / `test` | Types / tests Vitest |
| `npm run prisma:generate` / `prisma:push` / `prisma:migrate` | Prisma (Postgres) |

## Structure du dépôt

```
app/                 Front Nuxt (pages, composants, composables, data)
server/
  api/**             API Nitro actuelle (1 route/fichier : <segment>.<méthode>.ts)
  utils/*Store.ts    Logique métier (couplée à Nitro, à découpler au portage)
backend/             API Express autonome (en extraction) — voir backend/README.md
prisma/              Schéma + migrations SQLite de l'app
docker-compose.yml   PostgreSQL (+ Adminer) pour le backend
tests/               Vitest (unitaires, HTTP, contrat)
e2e/                 Parcours Playwright
docs/
  adr/               Décisions d'architecture (ADR) — voir docs/adr/README.md
  ...                architecture-api, database-schema, deployment, audits
```

## Documentation

- [Décisions d'architecture (ADR)](docs/adr/README.md) — dont le chantier d'extraction (0014-0016)
- [Architecture de l'API](docs/architecture-api.md) · [Schéma de base de données](docs/database-schema.md)
- [Déploiement & CI/CD](docs/deployment.md)
- [Guide de contribution](CONTRIBUTION.md) · [Conventions de commit](.github/commit-conventions.md)

## Contribution

- **Toujours créer une branche depuis `develop` avant de commencer** (`feat/…`,
  `fix/…`, `chore/…`, `docs/…`) — jamais de travail directement sur `develop`.
- **Commits** : [Conventional Commits + gitmoji](.github/commit-conventions.md)
  (ex. `feat: ✨ …`, `fix: 🐛 …`), atomiques.
- Ouvrir une **Pull Request vers `develop`**. La CI (lint, typecheck, tests,
  build, Danger sur la taille de PR) doit être verte avant fusion ; `develop`
  déploie en staging, `master` en production.
