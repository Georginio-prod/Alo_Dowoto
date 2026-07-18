# Pré-audit complet — WorkTogo (Alo_Dowoto)

> Audit réalisé le 2026-07-17 par lecture du code réel et exécution des
> vérifications automatisées (lint, typecheck, tests, audit de dépendances).
> Branche auditée : `revert/226-curseur-magnetique-titre`.
> Objectif : état des lieux honnête et priorisé, pas une correction immédiate.

---

## Vérifications réellement exécutées (preuves, pas suppositions)

| Vérification | Commande | Résultat |
|---|---|---|
| Lint | `npm run lint` (ESLint strict + règle 300 lignes) | ✅ **0 erreur** |
| Typage | `npm run typecheck` (`nuxt typecheck` / vue-tsc) | ✅ **0 erreur** |
| Tests | `npm test` (Vitest) | ✅ **199 tests / 29 fichiers, tous verts** (14,6 s) |
| Dépendances | `npm audit` | ✅ **0 vulnérabilité** |
| `as any` / `@ts-ignore` (app+server) | grep | ✅ **0** |
| `console.log` (app+server) | grep | ✅ **0** |
| TODO/FIXME dans l'arbre réel | grep (hors `.claude/worktrees`) | ✅ **0** |

**Verdict global : projet de qualité artisanale élevée sur la forme (code,
conventions, CI, tests, docs), mais avec un défaut structurel unique et majeur
sur le fond — la persistance des données — qui rend l'application non
déployable en l'état pour son cœur métier (paiement en séquestre).**

---

## Contexte (Étape 0)

**Produit.** WorkTogo (« Alo Dowoto ») : place de marché togolaise mettant en
relation des **clients/chercheurs** et des **prestataires** de services
(ménage, plomberie, électricité, maçonnerie…). Le cœur du produit est un
**système de paiement en séquestre (escrow)** avec portefeuille interne,
commission plateforme (10 %), double validation, remboursement et litige.

**Stack technique réelle.**
- **Framework :** Nuxt 4.4 (Vue 3.5), rendu SSR + API intégrée via **Nitro server routes** (`server/api/**`).
- **Langage :** TypeScript strict (`strict: true`, `typeCheck: true`).
- **Style :** Tailwind CSS v4 (via `@tailwindcss/vite`), police Poppins.
- **ORM / DB :** Prisma 6.19, provider **SQLite** (`prisma/schema.prisma`).
- **Gestionnaire de paquets :** npm (`package-lock.json`).
- **Hébergement visé :** Vercel (serverless) — voir `docs/deployment.md`.
- **CI/CD :** GitHub Actions (`ci.yml` + `deploy.yml`).
- **Tests :** Vitest + happy-dom + @vue/test-utils.

**Structure.** Monorepo simple, un seul projet Nuxt bien rangé :
- `app/` — front (pages, composants, composables, layouts, middleware, data).
- `server/api/**` — ~50 routes (1 route/fichier, convention `<segment>.<méthode>.ts`).
- `server/utils/*Store.ts` — logique métier isolée du HTTP (bon découpage).
- `prisma/` — schéma + migrations versionnées.
- `docs/` — docs d'architecture, schéma DB, déploiement, audits a11y & responsive **réels et honnêtes**.

**Points d'entrée.** `app/app.vue` (front) ; côté serveur, chaque fichier de
`server/api/**` est un handler autonome. Garde d'auth front : `app/middleware/auth.ts`.

**Intention documentée vs code actuel.** Les docs internes (`architecture-api.md`,
`database-schema.md`, `deployment.md`) sont de bonne qualité et **assument
explicitement** que la plupart des stores sont « en mémoire » en attendant la
bascule DB (#45/#46). Le code est donc cohérent avec son intention déclarée —
la critique porte sur le fait que cette intention n'est **pas viable pour un
produit de paiement en production**. Le `README.md`, lui, est resté le
**template Nuxt par défaut** (ne décrit pas WorkTogo).

---

## Étape 1 — Audit par domaine

### 1. Architecture & organisation du code — ✅ Bon

- **Séparation des responsabilités exemplaire** : les handlers de routes sont
  minces (authentifier → valider → appeler le store → retourner `{ ressource }`),
  toute la logique métier vit dans `server/utils/*Store.ts`, framework-agnostique.
  Ex. `conversations/[id]/pay.post.ts` (19 lignes) délègue à `payEscrowOrder()`.
- Helpers transverses bien factorisés : `apiError.ts` (codes HTTP sémantiques),
  `requireSessionUser` / `requireProviderRole` / `requireClientRole`.
- Règle ESLint **`max-lines: 300`** activée en `error` → pas de fichier fourre-tout.
- **Duplication réelle et volumineuse** *(Mineur)* : `.claude/worktrees/` contient
  ~11 copies complètes du dépôt (worktrees d'agents), **non ignorées par git**
  (`git status` les montre en `??`). Alourdit l'arbre de travail et pollue les
  recherches. → à ajouter au `.gitignore`.

### 2. Qualité de code & bonnes pratiques — ✅ Très bon

- Lint **0 erreur**, typecheck **0 erreur**, **0 `as any`**, **0 `console.log`**.
- Règles strictes réellement en place : `no-explicit-any: error`,
  `no-non-null-assertion: error`, `eqeqeq`, `prefer-const`.
- Nommage clair, commentaires denses et **utiles** (ils expliquent le *pourquoi*
  et les limites, pas le *quoi*).
- Types **partagés nativement** front/back (ex. `resultats.vue` importe
  `ProviderSearchResult` depuis `server/utils/providerDirectory`) — bénéfice réel
  de l'architecture Nitro intégrée.

### 3. Sécurité — 🟠 Bon socle, un trou à combler avant prod

**Bien fait :**
- Mots de passe : **scrypt** + `timingSafeEqual` (`server/utils/password.ts`),
  règles de robustesse imposées à la création.
- Webhooks : signature **HMAC-SHA256** vérifiée en temps constant (`webhookSignature.ts`),
  webhook de paiement **idempotent** (`payments/webhook.post.ts:29`).
- OAuth Google : **`state` anti-CSRF** en cookie httpOnly, comparé au retour
  (`google/callback.get.ts:36`), **aucune PII dans l'URL** (profil passé en
  cookie httpOnly court), cookies `secure` en production, `sameSite: lax`.
- Autorisation par rôle centralisée + vérification de **propriété** des ressources
  (ex. `pay.post.ts:12` : `conversation.clientId !== user.id` → 404).
- Rate-limiting présent sur les points sensibles (OTP send/verify, quota contacts).
- Aucun secret en dur dans le code applicatif ; `.env` correctement gitignoré.

**Problèmes :**
- 🔴 **Important — Secret de webhook avec repli silencieux.**
  `server/utils/webhookSignature.ts:10` :
  `const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? 'dev-webhook-secret'`.
  Le commentaire dit « jamais en production », mais **rien ne l'impose** : si la
  variable n'est pas définie en prod, l'app utilise un secret **public et connu**,
  rendant les webhooks de paiement **forgeables** (confirmation de paiement /
  activation d'abonnement par un tiers). → **lever une erreur au démarrage si
  `NODE_ENV === 'production'` et secret absent.** (Même schéma à vérifier pour
  `wallet/webhook.post.ts`.)
- 🟡 **Mineur — `.env.example` désynchronisé.** Il ne documente **pas**
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, pourtant requis par le parcours
  OAuth (`google/*`). Un nouveau dev ne saura pas quoi renseigner.
- 🟡 **Mineur — Secret OAuth réel dans le `.env` local.** Le `.env` (non commité,
  ✅) contient un vrai `GOOGLE_CLIENT_SECRET`. Aucune fuite dans git, mais si ce
  `.env` a déjà été partagé (chat, capture, machine tierce), **le régénérer** dans
  Google Cloud Console par précaution.
- Non vérifiable ici : protection XSS repose sur l'échappement Vue par défaut
  (aucun `v-html` trouvé côté données utilisateur au cours de l'audit — à
  confirmer par une passe dédiée si des champs riches apparaissent).

### 4. Performance — 🟡 Correct, un point mobile à traiter

- 🟡 **Images non optimisées** *(Important pour la cible)* : `public/images/`
  contient `hero-illustration.png` (**1,35 Mo**) et 8 PNG de secteurs
  (~400–480 Ko chacun, **~3,5 Mo**). Aucun format moderne (WebP/AVIF), pas de
  module `@nuxt/image`, pas de redimensionnement responsive. Pour une audience
  **mobile togolaise** (données chères, réseau parfois lent), c'est un coût réel
  à l'ouverture. → convertir en WebP/AVIF + `@nuxt/image` + `loading="lazy"`.
- ✅ Requêtes front pensées : les favoris sont chargés **une seule fois** pour
  toutes les cartes plutôt qu'une requête par carte (`resultats.vue:93`).
- Bundle : `nuxt build` passe en CI ; taille non mesurée finement ici (pas
  d'analyse de bundle exécutée). Le code-splitting par page est natif Nuxt.
- Requêtes DB coûteuses / N+1 : **non applicable aujourd'hui** — les données
  métier sont en mémoire. Deviendra un vrai sujet à la bascule Prisma (le schéma
  a déjà des `@@index` pertinents, ex. `ProviderProfile @@index([sectorId, city])`).

### 5. UX / UI & accessibilité — ✅ Bon

- États UI complets et soignés : `resultats.vue` gère **chargement**
  (`ResultsSkeleton`, `role="status"`), **vide** (`ResultsEmptyState`), et
  résultats — les trois cas sont distincts.
- Design system cohérent via tokens CSS + Tailwind (couleurs centralisées dans
  `main.css`), pas de styles dupliqués divergents constatés.
- **Accessibilité déjà auditée** (`docs/accessibility-audit.md`) : ARIA/labels
  vérifiés composant par composant, contraste `--color-muted` corrigé par calcul
  WCAG, focus clavier visible, fermeture `Échap` des modales. Audit **statique**
  et honnête sur sa limite : axe/Lighthouse restent à passer dans un vrai
  navigateur (checklist fournie).
- Un `docs/responsive-audit.md` existe également (breakpoints).

### 6. Données & API — ✅ Bon, avec une réserve de robustesse

- Format d'erreur **cohérent** sur toutes les routes (Nitro + helpers `apiError`).
- Contrats de données typés et partagés front/back (pas de duplication de types).
- 🟡 **Pas de validation de schéma déclarative (type zod)** : la validation des
  entrées est **manuelle et inline** dans chaque handler (ex. `otp/verify.post.ts`
  vérifie méthode, contact normalisé, `/^\d{6}$/`). C'est correct et lisible
  aujourd'hui, mais fragile à l'échelle (risque de dérive/oubli sur les nouvelles
  routes). → envisager zod pour les corps de requête sensibles (paiement, escrow).
- Gestion d'erreur réseau côté client présente (`app/utils/apiErrorMessage.ts`),
  pas de retry automatique (acceptable).

### 7. Dépendances & dette technique — ✅ Sain

- **0 vulnérabilité** npm, dépendances récentes (Nuxt 4.4, Prisma 6.19, Vue 3.5).
- Override `h3@1.15.11` explicite (résolution de warnings connus).
- **Aucun TODO/FIXME dans l'arbre réel** (les seuls trouvés sont dans les copies
  `.claude/worktrees/`, hors périmètre).
- Dette assumée et **documentée** (paiements Flooz/T-Money et SMS simulés faute
  d'accès sandbox — ce n'est pas une dette cachée, c'est un choix tracé).
- Code mort : non détecté de façon significative au cours de l'audit.

### 8. Tests & fiabilité — 🟡 Bonne couverture *unitaire*, angle mort *HTTP*

- **199 tests / 29 fichiers, tous verts.** Les stores métier sont **bien
  couverts** : `escrowOrderStore`, `walletStore`, `walletRechargeStore`,
  `conversationStore`, `quotaStore`, `matchingEngine`, `password`, `googleAuth`,
  `otpStore`, etc. Vitest branche même une **vraie base SQLite jetable** pour les
  stores Prisma (`tests/setup/prismaTestDb.ts`).
- 🟡 **Angle mort** : **aucun test au niveau des handlers de routes API**
  (autorisation réelle, orchestration escrow de bout en bout via HTTP, webhook
  de paiement, callback Google) ni test E2E. La logique est testée *unité par
  unité*, mais pas l'**assemblage** exposé au réseau — là où vivent les bugs
  d'autorisation et d'enchaînement d'états. → ajouter des tests d'intégration
  sur les routes critiques (`pay`/`deliver`/`receive`/`dispute`, `webhook`).

### 9. CI/CD & déploiement — ✅ Pipeline mûr / 🔴 cible incohérente avec la persistance

- ✅ **CI complet sur chaque PR** (`ci.yml`) : `npm ci` → lint → `prisma generate`
  → typecheck → tests → `nuxt build`. Concurrence annulable, Node 22.
- ✅ **Deploy gated** (`deploy.yml`) : ne se déclenche qu'après **succès** du CI
  sur push `develop`→staging / `master`→production, via `workflow_run`. Secrets
  Vercel jamais en clair. C'est du CI/CD de niveau professionnel.
- ✅ Variables d'env : `.env.example` (hors variables Google, cf. §3), bonne doc
  de gestion des secrets (`deployment.md`).
- 🔴 **Critique — Incompatibilité cible ↔ persistance** (voir §10) : le deploy
  vise **Vercel serverless**, or l'app stocke son cœur métier en mémoire de
  process + SQLite fichier. **Ni l'un ni l'autre ne survit en serverless.**
- 🟡 Monitoring : **aucun outil de suivi d'erreurs en production** (Sentry ou
  équivalent) détecté dans le code. En prod, aucune visibilité sur les erreurs
  réelles. (Non vérifiable côté infra Vercel — à confirmer.)

### 10. Scalabilité & maintenabilité — 🔴 Le point structurel du projet

- 🔴 **Critique — Persistance en mémoire de tout le cœur métier.** Seul le bloc
  **auth** (`User`, `Session`, `OtpCode`, `VerifiedContact`) est réellement en
  base Prisma (#218). **Tout le reste vit dans des `Map` en mémoire de process** :
  portefeuilles et mouvements (`walletStore`), commandes en séquestre
  (`escrowOrderStore`), conversations et messages (`conversationStore`), favoris,
  abonnements, paiements, quotas, avis, réclamations, témoignages, vérifications.
  Le schéma Prisma ne contient même **pas de modèle** pour la plupart d'entre eux
  (wallet, escrow, conversation).
  **Conséquences concrètes :**
  1. **Perte totale de données au moindre redémarrage** — un déploiement, un
     crash ou une mise à l'échelle **efface tous les soldes, tous les séquestres
     en cours et toutes les conversations**. Pour un produit qui manipule de
     l'argent, c'est rédhibitoire.
  2. **Impossible de scaler horizontalement** : chaque instance a ses propres
     `Map`. Deux requêtes du même utilisateur routées sur deux instances voient
     deux soldes différents. → « ×10 de trafic » ne casse pas *dégradé*, ça casse
     *net* dès la 2ᵉ instance.
- 🔴 **Critique — Sur Vercel, ça ne fonctionne pas du tout.** En serverless :
  les `Map` ne sont **pas partagées** entre invocations/instances (état perdu
  entre deux clics), et un fichier **SQLite** est **éphémère et non inscriptible**
  — même l'auth « persistée » ne tiendra pas. La `DATABASE_URL` par défaut est
  `file:./dev.db`.
- 🟠 **Important — La bascule Postgres n'est pas le « swap d'URL » annoncé.**
  `docs/database-schema.md` et `deployment.md` affirment qu'on peut pointer
  `DATABASE_URL` vers PostgreSQL « sans changer le schéma ». C'est **inexact** :
  `prisma/schema.prisma:18` fixe `provider = "sqlite"` **en dur** — passer à
  Postgres impose de changer le provider **et de régénérer les migrations**
  (les migrations SQLite existantes ne rejouent pas sur Postgres).
- 🟡 **Maintenabilité — Onboarding.** Le `README` est le template Nuxt par
  défaut. Un nouveau dev doit deviner ce qu'est WorkTogo. Les *bonnes* docs sont
  dans `docs/` mais rien ne les pointe depuis la racine.
- 🟡 **Validation tacite escrow (72h) sans planificateur.** La libération
  automatique après 72h (`applyTacitValidationIfExpired`) se déclenche
  **« à la prochaine lecture »** de la commande. Si personne ne rouvre la
  conversation, les fonds ne sont jamais libérés. Assumé pour le prototype
  mono-process — mais nécessitera un vrai job/cron en prod.

---

## Étape 2 — Synthèse priorisée *(lisible seule)*

Le projet est **très bien tenu sur la forme** (code propre, typé strict, testé,
linté, CI/CD gated, docs honnêtes) mais **inachevé sur le fond le plus critique
d'un produit de paiement : la persistance**. Aujourd'hui, l'application est un
**prototype avancé et de grande qualité**, pas un produit déployable pour son
cœur métier (escrow/portefeuille).

### 🟢 Quick wins — fort impact, faible effort

1. **Bloquer le secret de webhook par défaut en production.**
   *(`webhookSignature.ts`, + `wallet/webhook.post.ts`)* — Lever une erreur au
   démarrage si `NODE_ENV=production` et `PAYMENT_WEBHOOK_SECRET` absent.
   **Risque évité :** paiements/abonnements activables par un tiers via un secret
   public connu. ~15 min.
2. **Compléter `.env.example` avec `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.**
   **Gain :** parcours OAuth reproductible par tout dev / tout environnement. ~5 min.
3. **Ignorer `.claude/worktrees/` dans `.gitignore`.**
   **Gain :** arbre de travail et recherches propres ; évite un commit accidentel
   de ~11 copies du repo. ~2 min.
4. **Remplacer le `README` par une vraie présentation** (produit, stack, liens
   vers `docs/`, commandes). **Gain :** onboarding immédiat. ~30 min.
5. **Régénérer le secret OAuth Google** si le `.env` a pu circuler. Précaution.

### 🟠 Chantiers moyens — un peu de travail, débloquent/sécurisent

6. **Tests d'intégration sur les routes critiques** (escrow `pay`/`deliver`/
   `receive`/`dispute`, `payments/webhook`, `auth/google/callback`).
   **Gain :** couvre l'assemblage HTTP + autorisations, là où se cachent les bugs
   d'argent et d'accès que les tests de stores ne voient pas.
7. **Optimiser les images** (WebP/AVIF, `@nuxt/image`, `loading="lazy"`,
   tailles responsive). **Gain direct** sur le temps de chargement mobile — cœur
   de la cible togolaise. ~4,9 Mo d'images aujourd'hui.
8. **Validation de schéma (zod) sur les corps de requête sensibles** (paiement,
   escrow, inscription). **Gain :** robustesse et non-régression quand de
   nouvelles routes s'ajoutent.
9. **Instrumentation d'erreurs en production** (Sentry ou équivalent).
   **Gain :** passer d'« aucune visibilité » à un diagnostic des incidents réels.

### 🔴 Chantiers structurants — à décider avant toute mise en production

10. **Persister le cœur métier en base** (le vrai #46) : modéliser
    `Wallet`/`WalletMovement`, `EscrowOrder`, `Conversation`/`Message`, favoris,
    quotas, avis, etc. dans Prisma et remplacer les `Map` par des requêtes.
    **Sans cela, aucune donnée d'argent ne survit à un redémarrage et le multi-
    instance est impossible.** C'est le préalable absolu à une prod.
    - Traiter les mouvements de portefeuille dans des **transactions** DB (le
      couple `getBalance` puis `append` de `walletStore` n'est atomique que grâce
      au mono-thread JS actuel ; en base concurrente, il faudra une transaction /
      contrainte pour empêcher un solde négatif par double débit).
11. **Choisir une cible d'hébergement cohérente avec l'état.** Soit garder Vercel
    **avec une base managée externe** (Postgres/Neon/Supabase) et **zéro état en
    mémoire**, soit passer à un **serveur Node persistant** (preset Nitro
    `node-server` sur VPS/conteneur) si l'on veut des jobs planifiés et un process
    long. **Décision d'architecture** à prendre explicitement, puis corriger la
    doc `database-schema.md` / `deployment.md` (provider Prisma, migrations
    Postgres, mention « swap d'URL » à retirer).
12. **Planificateur pour les échéances escrow** (libération tacite 72h, relances)
    une fois la persistance et l'hébergement fixés — remplace le déclenchement
    « à la prochaine lecture ».

---

## Étape 3 — Idées d'amélioration produit *(suggestions, pas des défauts)*

Repérées en lisant la logique déjà en place :

- **Interface de médiation des litiges.** `listDisputedOrders()` existe déjà
  (`escrowOrderStore.ts`) mais aucune UI ne la consomme : les commandes
  `disputed` gèlent les fonds sans écran d'arbitrage côté équipe WorkTogo. La
  brique arrière est prête — c'est une opportunité produit nette.
- **Notifications d'événements escrow** (SMS/email) : livraison marquée, litige
  ouvert, fonds libérés, remboursement. Les canaux (Twilio/Brevo) sont déjà
  câblés pour l'OTP — les réutiliser sur les transitions d'état de séquestre
  renforcerait fortement la confiance.
- **Renvoi du code OTP** : le bouton de renvoi n'est pas branché à l'API
  (`// TODO: appeler l'API de renvoi du code (#23)` dans `auth.vue`), alors que
  la route `otp/send` existe et gère déjà le rate-limiting.
- **Devis à valider** au-delà du tarif fixe : l'escrow ne gère aujourd'hui que le
  **tarif fixe affiché** (commenté dans `escrowOrderStore.ts`). Un vrai flux de
  devis (proposition → acceptation → séquestre) élargirait les cas d'usage.
- **Géolocalisation réelle** pour « Prestataires près de vous » (aujourd'hui
  simple filtrage par ville via `user.location`, cf. `resultats.vue:83`).
- **Gestion dynamique des secteurs** : les secteurs sont statiques
  (`app/data/sectors.ts`) ; le schéma prévoit déjà `Sector`/`SubSector` en base,
  ce qui permettrait d'ajouter/désactiver un secteur **sans redéploiement**.

---

## Limites de cet audit (ce que je n'ai PAS pu vérifier)

- **Pas d'exécution en navigateur** : a11y (axe/Lighthouse), responsive réel,
  ordre de focus dynamique et taille exacte du bundle **non mesurés** ici — la
  checklist de `docs/accessibility-audit.md` reste à passer manuellement.
- **Pas d'accès à l'infra Vercel / à la prod** : présence réelle de monitoring,
  variables d'environnement réellement configurées, et comportement d'exécution
  serverless **non observés** — les conclusions du §10 sont déduites du code et
  des choix documentés, pas d'un déploiement observé.
- **Intégrations paiement/SMS simulées** : le comportement réel Flooz/T-Money et
  Twilio/Brevo n'a pas pu être exercé (pas d'accès sandbox), conformément à ce
  que la doc annonce.
