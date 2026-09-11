# WorkTogo (Alo Dowoto) — Plateforme de mise en relation clients ↔ prestataires

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-Vitest%20%2B%20Playwright-45ba4b?logo=playwright&logoColor=white)

🔗 **Démo en ligne** : <https://alodowoto-production.up.railway.app/> (hébergée sur Railway)
📦 **Code source** : <https://github.com/Georginio-prod/Alo_Dowoto>
🎨 **Maquettes de référence** : <https://github.com/Georginio-prod/worktogo-design-assets>

---

## 📌 Présentation

**WorkTogo** (« Alo Dowoto » en éwé, langue du Togo) est une **marketplace de services
togolaise** : un particulier ou une entreprise (le *chercheur*) décrit un besoin
(plomberie, couture, informatique, ménage…), la plateforme lui propose les meilleurs
*prestataires* à proximité, puis sécurise la mission grâce à un **paiement en séquestre
(escrow)** et un **portefeuille interne** alimenté par Mobile Money.

C'est le projet le plus complet de mon portfolio : front Nuxt, API Express, base
PostgreSQL, tableau d'administration, tests unitaires / d'intégration / end-to-end,
CI GitHub Actions, Docker, et une documentation d'architecture (ADR).

## ✨ Fonctionnalités

### Côté chercheur (client)
- Recherche par **secteur / sous-secteur**, **localisation** (carte Leaflet + rayon) et **urgence**.
- **Moteur de matching pondéré** (`matchingEngine.ts`) : score selon compétences, distance, note, disponibilité et budget.
- Résultats en grille, favoris, profils prestataires détaillés, prise de contact et **messagerie interne**.
- **Portefeuille** : recharge (Mobile Money via webhook signé), solde, historique des mouvements.
- **Escrow** : le paiement est bloqué, libéré après preuve d'intervention, avec réassignation automatique, annulation client et **résolution de litiges**.
- Services récurrents, replanification, réservation à nouveau (*rebook*), avis et témoignages.
- Parrainage, réclamations, assistant IA (Gemini ou Anthropic, avec repli FAQ hors-ligne).

### Côté prestataire
- Inscription par étapes (identité → contact → OTP SMS/e-mail → mot de passe → coordonnées de paiement → secteur).
- Profil professionnel : CV, formations, certifications, langues, préférences, calendrier de disponibilités.
- **Vérification d'identité (KYC)** et décisions admin.
- Abonnements / formules (freemium, quotas mensuels).

### Administration
- Vue d'ensemble, gestion des prestataires, chercheurs, catégories, missions, paiements, litiges, avis (modération), abonnements, notifications / campagnes, paramètres de plateforme.
- **Anti-désintermédiation** : détection des tentatives de contournement (échange de contacts hors plateforme), alertes fraude, journal d'audit.

### Transverse
- **Bilingue FR / EN** (`@nuxtjs/i18n`), thème clair / sombre, responsive.
- Pages légales (CGU, confidentialité, cookies, mentions légales), FAQ, aide, contact.
- Observabilité Sentry (front + API), documentation OpenAPI (`/api/docs`).

## 🏗️ Architecture

```text
Navigateur
    │  /api/** (même origine, cookie httpOnly `wt_session`)
    ▼
nginx (sert la SPA Nuxt statique + reverse proxy)
    ▼
Express API ── Prisma ── PostgreSQL
```

| Composant | Rôle | Technologies |
|---|---|---|
| `app/` | Interface web (SPA statique, `ssr: false`) | Nuxt 4 · Vue 3 · Tailwind v4 · Leaflet |
| `backend/` | API REST, règles métier, migrations, accès données | Express · Zod · Prisma · PostgreSQL |
| `docker/` | Reverse proxy, en-têtes de sécurité | nginx |
| `e2e/` | Parcours utilisateur complets | Playwright |
| `docs/` | Architecture, schéma BDD, audits, ADR | Markdown |

Le backend est organisé en couches : `route → validation → controller → service → repository → Prisma`.
Les erreurs sont normalisées `{ error, statusCode, message, data }`. Les référentiels
(secteurs, régions, rayons) vivent dans `backend/src/data/` et sont partagés avec le front.

**Modèle de données (extrait des 40+ modèles Prisma)** : `User`, `ProviderProfile`, `Sector`,
`ServiceRequest`, `ServiceRequestMatch`, `EscrowOrder`, `WalletMovement`, `Payment`,
`Subscription`, `Conversation`, `Message`, `Review`, `Complaint`, `Verification`, `KycDecision`,
`FraudAlert`, `AuditLog`, `NotificationCampaign`…

## 📁 Structure du projet

```
Alo_Dowoto/
├── app/                      # Front Nuxt 4
│   ├── pages/                # index, auth, resultats, matching/[id], messages, profil,
│   │                         # prestataire/*, dashboard/client, admin/*, pages légales…
│   ├── components/           # ~80 composants (AuthOtpStep, ProviderMap, EscrowStatusPanel,
│   │                         # WalletRechargeForm, DisputeForm, admin/…)
│   ├── composables/ middleware/ plugins/ types/ utils/
│   └── data/legalPages/      # Contenu des pages légales
├── backend/
│   ├── prisma/schema.prisma  # Schéma + migrations versionnées
│   ├── src/routes/           # 20 routers (auth, wallet, payments, escrow, admin…)
│   ├── src/services/         # ~60 services métier (matchingEngine, escrow*, fraudDetection…)
│   ├── src/repositories/ controllers/ middleware/ validation/ data/
│   └── scripts/              # seed.ts, create-admin.mjs
├── docker/ · Dockerfile · docker-compose.yml
├── docs/                     # architecture-api.md, database-schema.md, deployment.md, adr/
├── e2e/ · tests/             # Playwright / Vitest
├── i18n/locales/{fr,en}.json
└── .github/workflows/        # ci, backend-ci, playwright, docker, danger
```

## 🚀 Installation & lancement

### Option A — Tout avec Docker (recommandé)

Prérequis : Docker Desktop.

```bash
git clone https://github.com/Georginio-prod/Alo_Dowoto.git
cd Alo_Dowoto
cp backend/.env.example backend/.env     # renseigner au minimum PAYMENT_WEBHOOK_SECRET
docker compose up --build
```

→ Site sur <http://localhost:3000>. PostgreSQL exposé sur le port `5433`. Les migrations
sont appliquées automatiquement par le service `migrate`.
Adminer (interface BDD) : `docker compose --profile tools up -d adminer` → <http://localhost:8080>.

### Option B — Développement local

Prérequis : **Node.js 22**, npm, PostgreSQL (le conteneur suffit).

```bash
docker compose up -d postgres
cp .env.example .env
cp backend/.env.example backend/.env
npm ci
npm run db:generate        # client Prisma
npm run db:migrate         # migrations
npm run db:seed            # (optionnel) jeu de démonstration
npm --prefix backend run dev   # API sur :3001
npm run dev                    # front sur :3000 (proxy /api → :3001)
```

Créer un administrateur : `npm run admin:create -- email motDePasse`.

### Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run build` | Génère le front statique |
| `npm test` / `npm --prefix backend test` | Tests unitaires front / tests HTTP & métier API |
| `npm run test:e2e` | Parcours Playwright (PostgreSQL requis) |
| `npm run lint` / `npm run typecheck` | Qualité de code |
| `npm run db:studio` | Prisma Studio |

## ⚙️ Configuration

- `.env.example` (front) : `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_SENTRY_DSN`, `NUXT_DEV_API_PROXY_TARGET`.
- `backend/.env.example` (API) : `DATABASE_URL`, `CORS_ORIGINS`, `APP_ORIGIN`, `PAYMENT_WEBHOOK_SECRET` (**obligatoire en prod**),
  Google OAuth, OTP (Twilio / Brevo), IA (`AI_PROVIDER`, `GEMINI_API_KEY` ou `ANTHROPIC_API_KEY`), Sentry.

> ⚠️ Ne jamais versionner `backend/.env`.

## 🌐 Déploiement

La production tourne sur **Railway** à partir des images Docker (`web` nginx + SPA, `api` Express, `postgres`).
Le fichier `vercel.json` **désactive volontairement** les déploiements Vercel : l'application
nécessite une API et une base de données persistantes, ce qu'un hébergement statique ne fournit pas.
Voir [docs/deployment.md](docs/deployment.md).

## 📚 Documentation complémentaire

- [Architecture API](docs/architecture-api.md) · [Schéma PostgreSQL](docs/database-schema.md) · [Déploiement](docs/deployment.md)
- [Décisions d'architecture (ADR 0001 → 0017)](docs/adr/README.md) : paiement intégral plateforme, partenaire escrow, freemium, extraction du backend Express, tests de contrat…
- [Audits](docs/) : accessibilité, responsive, structure / clean code.
- [Guide de contribution](CONTRIBUTION.md)

## 🎓 Ce que ce projet démontre

Conception d'un produit complet (métier, paiement, sécurité), architecture en couches
testable, migration Nitro → Express pilotée par ADR et tests de contrat, CI/CD et
conteneurisation, i18n, cartographie, intégration IA et SMS.

---

## 👤 Auteur

**Komla Etonam Georges EKLOU** (Georginio) — Développeur Full Stack Web & Web3

[![GitHub](https://img.shields.io/badge/GitHub-Georginio--prod-181717?logo=github)](https://github.com/Georginio-prod)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profil-0A66C2?logo=linkedin)](https://www.linkedin.com/in/komla-etonam-georges-eklou-68518b23b)
[![Portfolio](https://img.shields.io/badge/Portfolio-georginio.w3frame.com-6C63FF)](https://georginio.w3frame.com/)

> 📚 Tous mes projets sont listés et documentés sur mon [profil GitHub](https://github.com/Georginio-prod).
