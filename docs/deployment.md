# Déploiement & CI/CD (#47)

## Hébergement choisi : Vercel

Le projet est déployé sur **[Vercel](https://vercel.com)**, aussi bien
pour le frontend (rendu SSR) que pour l'API (`server/api/**`).

### Justification

| Critère | Vercel (choisi) | Alternative (VPS / conteneur générique) |
|---|---|---|
| Cohérence avec l'architecture existante | Une seule cible de déploiement pour front + API, comme décrit dans [`docs/architecture-api.md`](./architecture-api.md) (« un seul build, une seule cible ») | Nécessite quand même un seul serveur Node si on veut garder l'API intégrée — pas d'avantage réel |
| Support Nuxt/Nitro | Natif : détection automatique du framework, preset Nitro `vercel` géré automatiquement (aucune config manuelle requise) | Preset Nitro `node-server` à builder et servir soi-même (process manager, reverse proxy) |
| Routes API `/api/**` | Déployées comme fonctions serverless sur la même cible, sans configuration supplémentaire | À exposer et sécuriser manuellement (Nginx/Caddy, HTTPS, etc.) |
| Coût pour un petit projet | Gratuit (plan Hobby) pour ce volume de trafic | Coût d'un serveur même minimal, à maintenir |
| Aperçus par Pull Request / branche | Preview deployments automatiques par push (utilisés ici pour `develop`) | À construire soi-même |
| Effort d'exploitation (patchs OS, TLS, scaling) | Aucun — entièrement géré par Vercel | À la charge de l'équipe |
| Taille de l'équipe / du projet | Adapté (équipe réduite, pas de besoin d'infra sur-mesure) | Se justifie surtout si des contraintes spécifiques (data locale, coûts à grande échelle) apparaissent plus tard |

Cette décision suit directement le choix déjà documenté dans
`docs/architecture-api.md` : les routes Nitro sont intégrées au projet
Nuxt plutôt que séparées en backend indépendant — Vercel est la plateforme
qui exploite le mieux cette architecture « un seul build » sans effort
d'infrastructure supplémentaire.

## Pipeline CI/CD

Deux workflows GitHub Actions séparés, dans `.github/workflows/` :

```
push / pull_request
        │
        ▼
┌───────────────────┐
│   ci.yml (CI)      │  lint → prisma generate → typecheck → tests → build
└─────────┬─────────┘
          │ workflow_run (uniquement si succès ET push, pas une PR)
          ▼
┌────────────────────────────┐
│   deploy.yml (Deploy)       │
│                             │
│  head_branch == develop     │──▶ vercel deploy            (preview/staging)
│  head_branch == master      │──▶ vercel deploy --prod     (production)
└────────────────────────────┘
```

### `ci.yml` — intégration continue

Déclenché sur **chaque Pull Request** (quelle que soit la branche de
base) et sur **chaque push** vers `develop`/`master`. Étapes : checkout,
`setup-node` (Node 22, cohérent avec le CI existant), `npm ci`, `lint`,
génération du client Prisma (`db:generate` — nécessaire dès maintenant
car `prisma.config.ts` exige `DATABASE_URL`, même pour une simple
génération de types sans connexion réelle), `typecheck`, `test`, `build`.

### `deploy.yml` — déploiement

Ne se déclenche **qu'après un succès de `ci.yml` sur un push** (jamais
sur une Pull Request, jamais si le CI a échoué) grâce à l'événement
[`workflow_run`](https://docs.github.com/actions/using-workflows/events-that-trigger-workflows#workflow_run) :
GitHub Actions ne permet pas `needs:` entre deux fichiers de workflow
différents, `workflow_run` est l'équivalent pour deux workflows séparés.

- Push sur **`develop`** → job `deploy-staging` → `vercel deploy` (déploiement
  preview, sert de staging).
- Push sur **`master`** → job `deploy-production` → `vercel deploy --prod`.

Chaque job utilise la CLI officielle `vercel` (`vercel pull` → `vercel
build` → `vercel deploy --prebuilt`), authentifiée via les secrets GitHub
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (jamais en clair dans
le workflow).

> **Note sur les noms de branches :** l'issue #47 mentionne `main` comme
> branche de production. Ce dépôt n'a pas de branche `main` : la branche
> par défaut est `develop`, et `master` (issue du scaffold initial) est la
> seule autre branche existante — c'est donc elle qui joue le rôle de
> branche de production dans les workflows CI et Deploy, en cohérence avec
> `ci.yml` qui l'utilisait déjà avant ce lot.

## Variables d'environnement & secrets

### Déjà utilisées dans le code

| Variable | Usage | Où |
|---|---|---|
| `DATABASE_URL` | Connexion Prisma applicative — **PostgreSQL via le pooler Supabase** (port 6543, `pgbouncer=true`) | `prisma/schema.prisma` |
| `DIRECT_URL` | Connexion **directe** PostgreSQL (Supabase session pooler, port 5432) réservée aux migrations Prisma (`migrate deploy`) — le pooler transactionnel 6543 ne les supporte pas | `prisma/schema.prisma`, `prisma.config.ts` |
| `PAYMENT_WEBHOOK_SECRET` | Signature/vérification HMAC du webhook de paiement (`#34`) | `server/utils/webhookSignature.ts` |

### Prévues, pas encore branchées (à ne pas oublier lors de l'intégration réelle)

| Variable | Prévue pour | État actuel |
|---|---|---|
| `FLOOZ_API_KEY` | Identifiants marchand Flooz | `server/api/payments/initiate.post.ts` simule la confirmation opérateur (pas d'accès sandbox pour ce lot, voir `#34`) |
| `TMONEY_API_KEY` | Identifiants marchand T-Money | idem |
| `SMS_PROVIDER_API_KEY` | Provider SMS togolais pour l'envoi des codes OTP | `TODO(#23)` dans `server/api/auth/otp/send.post.ts` — le code est aujourd'hui seulement journalisé côté serveur |

Voir [`.env.example`](../.env.example) à la racine pour la liste complète
avec commentaires (jamais de vraie valeur committée — uniquement des noms
de variables et des placeholders vides).

### Secrets GitHub Actions à configurer manuellement

Ces secrets ne peuvent pas être créés par un agent ou un commit : ils
doivent être ajoutés à la main dans **Settings → Secrets and variables →
Actions** du dépôt GitHub (au niveau du repo, ou d'un
[environment](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)
`staging`/`production` si on veut des valeurs différentes par cible) :

- `VERCEL_TOKEN` — jeton d'accès personnel Vercel ([vercel.com/account/tokens](https://vercel.com/account/tokens))
- `VERCEL_ORG_ID` — identifiant de l'organisation/compte Vercel (`vercel link` en local le révèle dans `.vercel/project.json`)
- `VERCEL_PROJECT_ID` — identifiant du projet Vercel (idem)

Une fois le projet Vercel lié et les variables d'environnement applicatives
(`DATABASE_URL`, `PAYMENT_WEBHOOK_SECRET`, et plus tard `FLOOZ_API_KEY` /
`TMONEY_API_KEY` / `SMS_PROVIDER_API_KEY`) ajoutées **directement dans les
réglages du projet Vercel** (Project Settings → Environment Variables,
avec des valeurs distinctes Preview/Production), `vercel build` les
injecte automatiquement au moment du build — elles n'ont pas besoin d'être
dupliquées comme secrets GitHub.

### Ajouter une nouvelle variable d'environnement secrète, en pratique

1. Utiliser la variable dans le code via `process.env.MA_VARIABLE` (ou
   `useRuntimeConfig()` si elle doit aussi être lue côté build/serveur de
   façon typée) — jamais de valeur en dur.
2. L'ajouter à [`.env.example`](../.env.example) avec un commentaire
   expliquant son usage et une valeur **vide ou placeholder** (jamais la
   vraie valeur).
3. La renseigner dans son `.env` local (non versionné, voir `.gitignore`)
   pour le développement.
4. Pour le déploiement : l'ajouter dans **Project Settings → Environment
   Variables** du projet Vercel (Preview et/ou Production selon le
   besoin) — c'est là que vivent les vraies valeurs de secrets applicatifs.
5. Si la variable est nécessaire **au pipeline CI lui-même** (et non à
   l'application déployée — ex. un token utilisé par une étape de test),
   l'ajouter comme secret GitHub Actions (Settings → Secrets and
   variables → Actions) et la référencer dans le workflow via
   `${{ secrets.MA_VARIABLE }}`, jamais en clair.

## Critères d'acceptation (#47)

- [x] Hébergement choisi pour le frontend et l'API (voir « Hébergement
      choisi » ci-dessus)
- [x] Pipeline de build/déploiement automatique sur push vers `develop`
      (staging) et `master` (production — voir note sur les noms de
      branches ci-dessus)
- [x] Variables d'environnement (clés Flooz/T-Money, SMS, base de
      données) gérées de façon sécurisée : noms documentés dans
      `.env.example` et ci-dessus, vraies valeurs uniquement en secrets
      GitHub Actions / variables d'environnement Vercel, jamais commitées
