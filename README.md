# WorkTogo (Alo Dowoto)

Place de marché de services togolaise mettant en relation des **clients**
(chercheurs de prestations) et des **prestataires** (ménage, plomberie,
électricité, maçonnerie, menuiserie, peinture, jardinage, climatisation…).

Le cœur du produit est un **paiement en séquestre (escrow)** avec portefeuille
interne : le client alimente son solde par mobile money, paie une prestation
(fonds bloqués), et les fonds ne sont libérés vers le prestataire qu'après
double validation (ou 72 h de validation tacite), avec commission plateforme,
remboursement et gestion de litige.

## Stack

- **Framework :** [Nuxt 4](https://nuxt.com) (Vue 3, rendu SSR)
- **API :** routes serveur [Nitro](https://nitro.build) intégrées (`server/api/**`) — voir [docs/architecture-api.md](docs/architecture-api.md)
- **Langage :** TypeScript strict
- **Style :** Tailwind CSS v4
- **ORM / base :** [Prisma](https://www.prisma.io) (SQLite en développement) — voir [docs/database-schema.md](docs/database-schema.md)
- **Tests :** [Vitest](https://vitest.dev) + @vue/test-utils
- **Hébergement / CI :** Vercel + GitHub Actions — voir [docs/deployment.md](docs/deployment.md)

## Prérequis

- Node.js 22
- npm

## Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env      # puis renseigner les valeurs locales

# 3. Créer la base de développement (SQLite) + générer le client Prisma
npm run db:migrate

# 4. Lancer le serveur de développement (http://localhost:3000)
npm run dev
```

Les variables d'environnement sont documentées dans [`.env.example`](.env.example)
(base de données, secret de webhook de paiement, OTP SMS/email, OAuth Google).
Aucune valeur réelle n'est versionnée — voir [docs/deployment.md](docs/deployment.md)
pour la gestion des secrets en CI/CD et sur Vercel.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm run lint` / `lint:fix` | ESLint (strict, règle des 300 lignes) |
| `npm run typecheck` | Vérification de types (`nuxt typecheck`) |
| `npm test` / `test:watch` | Tests unitaires (Vitest) |
| `npm run db:migrate` | Créer/appliquer une migration Prisma (dev) |
| `npm run db:generate` | Régénérer le client Prisma |
| `npm run db:studio` | Explorer la base (Prisma Studio) |

## Structure

```
app/                 Front (pages, composants, composables, layouts, middleware, data)
server/
  api/**             Routes API (1 route/fichier, convention <segment>.<méthode>.ts)
  utils/*Store.ts    Logique métier, isolée du HTTP
prisma/              Schéma + migrations versionnées
tests/               Tests Vitest
docs/                Architecture, schéma DB, déploiement, audits a11y & responsive
```

**Convention API :** un handler ne fait qu'authentifier/autoriser, valider la
requête, appeler le store, et retourner `{ <ressource>: valeur }`. La logique
métier vit dans `server/utils/*Store.ts`.

## Documentation

- [Architecture de l'API](docs/architecture-api.md)
- [Schéma de base de données](docs/database-schema.md)
- [Déploiement & CI/CD](docs/deployment.md)
- [Audit accessibilité](docs/accessibility-audit.md)
- [Audit responsive](docs/responsive-audit.md)
- [Pré-audit complet](docs/pre-audit-complet.md)

## Contribution

Le travail se fait par branches `feat/…`, `fix/…`, `chore/…` ouvertes en Pull
Request vers `develop`. Chaque PR passe la CI (lint, typecheck, tests, build)
avant fusion ; `develop` déploie en staging et `master` en production (voir
[docs/deployment.md](docs/deployment.md)).
