# Déploiement Docker

## Artefacts

La production comporte trois services :

```text
web (nginx + SPA Nuxt) ──► api (Express) ──► postgres
```

- `Dockerfile` construit le front statique puis le sert avec nginx.
- `backend/Dockerfile` construit l'API et un target `migration` dédié.
- `docker-compose.yml` lance `migrate` avant l'API, sans ouvrir le port de
  l'API ni celui de PostgreSQL à Internet.

Le port PostgreSQL est publié uniquement pour simplifier le développement local.
Sur un hôte de production, retirer `postgres.ports` ou placer les services sur
un réseau interne.

## Variables requises

Créer `backend/.env` à partir de `backend/.env.example` et fournir au minimum :

```dotenv
PAYMENT_WEBHOOK_SECRET=une-valeur-longue-et-aleatoire
DATABASE_URL=postgresql://worktogo:mot-de-passe@postgres:5432/worktogo?schema=public
CORS_ORIGINS=https://votre-domaine.tg
APP_ORIGIN=https://votre-domaine.tg
```

Avec Compose, `DATABASE_URL` est automatiquement remplacée par
`DATABASE_URL_DOCKER` si cette dernière est définie, afin d'utiliser l'hôte
interne `postgres`. Garder les valeurs réelles hors du dépôt et d'un registre
d'images.

Les variables optionnelles sont documentées dans `backend/.env.example` :
Google OAuth, Twilio/Brevo, Sentry, assistant IA et mises à jour desktop.

Pour Google OAuth, `APP_ORIGIN` doit être l'URL publique exacte du front et
l'URI enregistrée dans Google Cloud doit être
`<APP_ORIGIN>/api/auth/google/callback`. En local avec le port 3100 :
`APP_ORIGIN=http://localhost:3100` et
`http://localhost:3100/api/auth/google/callback`.

## Lancement

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f migrate api web
```

Vérifications après déploiement :

```bash
curl -f http://localhost:3000/
curl -f http://localhost:3000/health
curl -f http://localhost:3000/health/db
```

`migrate` doit terminer avec le code 0 avant le démarrage de l'API. Une
migration échouée bloque volontairement le service applicatif.

## Mise à jour et retour arrière

1. Construire et tester les deux images dans la CI.
2. Sauvegarder PostgreSQL avant toute migration non additive.
3. Déployer l'image API et laisser `migrate` appliquer les migrations.
4. Déployer le front nginx.
5. Rejouer les trois vérifications ci-dessus.

Une image front précédente peut être restaurée immédiatement. Un retour arrière
de base nécessite une migration dédiée : Prisma ne défait pas une migration de
production automatiquement.

## CI

Les workflows vérifient le front, le backend, les parcours end-to-end et les
builds Docker. La publication vers un registre ou un fournisseur est volontairement
hors dépôt : elle dépend du compte et des secrets de l'organisation. Ajouter ces
secrets dans le gestionnaire de CI, jamais dans un fichier `.env` versionné.
