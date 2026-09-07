# WorkTogo (Alo Dowoto)

Plateforme togolaise de mise en relation entre clients et prestataires, avec
portefeuille, paiement en séquestre et tableau d'administration.

## Architecture

| Composant | Responsabilité | Technologie |
| --- | --- | --- |
| `app/` | Interface web statique | Nuxt 4 · Vue 3 |
| `backend/` | API, logique métier, migrations et accès aux données | Express · Prisma · PostgreSQL |
| `docker/` | Reverse proxy et en-têtes web | nginx |

Le navigateur appelle uniquement des URL relatives `/api/**`. nginx les relaie
vers Express : les cookies de session restent same-origin. Il n'y a plus de
routes API ni de logique métier dans Nuxt.

Les référentiels de secteurs, régions et rayons de recherche ont une seule
source : `backend/src/data/`, consommée par l'API et par le front.

## Démarrage avec Docker

Prérequis : Docker Desktop et Docker Compose.

```bash
cp backend/.env.example backend/.env
# renseigner au minimum PAYMENT_WEBHOOK_SECRET dans backend/.env
docker compose up --build
```

Le site est disponible sur <http://localhost:3000>. PostgreSQL est publié sur
le port hôte `5433` pour le développement. Les migrations sont appliquées une
fois par le service `migrate` avant le démarrage de l'API.

Pour ouvrir Adminer localement :

```bash
docker compose --profile tools up -d adminer
```

Puis ouvrir <http://localhost:8080> (serveur `postgres`, identifiants définis
dans `docker-compose.yml`).

## Développement local

Prérequis : Node.js 22, npm et PostgreSQL (le conteneur est recommandé).

```bash
docker compose up -d postgres
cp .env.example .env
cp backend/.env.example backend/.env
npm ci
npm run db:generate
npm run db:migrate
npm --prefix backend run dev
# dans un second terminal
npm run dev
```

Le front écoute sur <http://localhost:3000> et son proxy de développement
transmet `/api` à Express sur <http://localhost:3001>. Pour peupler une base
locale de démonstration : `npm run db:seed`.

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run build` | Génère le front statique |
| `npm run db:generate` | Génère le client Prisma du backend |
| `npm run db:migrate` | Applique les migrations versionnées PostgreSQL |
| `npm run db:seed` | Ajoute le jeu de démonstration idempotent |
| `npm run admin:create -- email motDePasse` | Crée ou promeut un administrateur |
| `npm test` | Tests unitaires du front |
| `npm --prefix backend test` | Tests HTTP et métier de l'API |
| `npm run test:e2e` | Parcours Playwright (PostgreSQL requis) |
| `npm run docker:up` | Construit et démarre la pile complète |

## Configuration

- [`.env.example`](.env.example) : variables publiques du front et cible du
  proxy de développement.
- [`backend/.env.example`](backend/.env.example) : base de données, OAuth,
  paiements, OTP, IA et observabilité. Ne jamais versionner `backend/.env`.

En production, utiliser un mot de passe PostgreSQL et un
`PAYMENT_WEBHOOK_SECRET` uniques, définir `CORS_ORIGINS` sur le domaine public,
et ne pas publier le port PostgreSQL.

## Documentation

- [Architecture API](docs/architecture-api.md)
- [Schéma et migrations PostgreSQL](docs/database-schema.md)
- [Déploiement Docker](docs/deployment.md)
- [Décisions d'architecture](docs/adr/README.md)
- [Contribution](CONTRIBUTION.md)
