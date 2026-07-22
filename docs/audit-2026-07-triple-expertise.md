# Audit complet — WorkTogo / Alo Dowoto

> Place de marché de services togolaise (Nuxt 4 / Vue 3 SSR, Nitro, Prisma, Tailwind v4).
> Cœur produit : paiement en séquestre (escrow) + portefeuille interne, mobile money (Flooz / T-Money).
> Audit réalisé sur la branche `develop`. Date : 22/07/2026.

Ce rapport est structuré en **trois casquettes** distinctes (Développeur, Designer UX/UI, Juriste),
suivies d'une **synthèse des priorités** et d'un **plan de mise en pratique**.

---

## 0. Impression générale (à lire en premier)

Contrairement à ce que le mot « failles » pourrait laisser craindre, ce projet est **mature et
bien tenu** : design system documenté, ADR (`docs/decisions/`), 58 fichiers de tests, CI + déploiement,
règle ESLint des 300 lignes, TypeScript strict, `prefers-reduced-motion` géré, anneaux de focus clavier,
webhooks signés en HMAC avec `timingSafeEqual`, OTP à tentatives limitées, cookies `httpOnly`.

Les vrais risques ne sont donc pas « du code sale » mais **quelques trous structurels précis**, dont
un seul est réellement bloquant pour une mise en production. Le reste est de l'amélioration incrémentale.

---

# PARTIE 1 — Audit technique & fonctionnel (casquette : Développeur)

## 1.1 Failles classées par gravité

### 🔴 CRITIQUE

**C1. Les données financières vivent en mémoire (RAM) et disparaissent à chaque redémarrage.**
`server/utils/walletStore.ts`, `escrowOrderStore.ts`, `paymentStore.ts`, `subscriptionStore.ts`
(et `conversationStore`, `requestStore`, `favoriteStore`, `reviewStore`, `quotaStore`…) utilisent tous
`new Map()`. Seuls `User`, `Session`, `OtpCode` sont réellement persistés via Prisma.

> Conséquence concrète : après un redéploiement Vercel, un `pm2 restart`, ou même un crash, **tous les
> soldes de portefeuille, toutes les commandes en séquestre, tous les paiements confirmés et tous les
> abonnements actifs sont perdus**. Pour une application qui bloque de l'argent réel en escrow, c'est
> rédhibitoire — et en environnement serverless (Vercel), la mémoire n'est même pas partagée entre
> deux invocations : le solde peut « disparaître » d'une requête à l'autre.

**Solution :** migrer ces stores vers Prisma. Le schéma existe déjà (`prisma/schema.prisma` contient
`WalletMovement`, `EscrowOrder`, `Payment`, `Subscription`, enums inclus) — le chantier est *documenté*
(#46) mais **pas terminé**. C'est LA priorité n°1 avant tout lancement.

*Exemple de bascule (walletStore) :*
```ts
// AVANT — server/utils/walletStore.ts
const movementsByUserId = new Map<string, WalletMovement[]>()
export function getBalance(userId: string) {
  return (movementsByUserId.get(userId) ?? []).reduce((s, m) => s + m.amount, 0)
}

// APRÈS
import { prisma } from '~~/server/utils/prisma'
export async function getBalance(userId: string) {
  const agg = await prisma.walletMovement.aggregate({
    where: { userId }, _sum: { amount: true },
  })
  return agg._sum.amount ?? 0
}
```
> Attention : rendre ces fonctions `async` impose de propager `await` dans tous les handlers `server/api/**`
> qui les consomment. À faire store par store, chacun avec ses tests — pas en un seul commit.

---

### 🟠 MAJEUR

**M1. Aucune intégration de paiement réelle.** `server/api/payments/initiate.post.ts` et
`wallet/recharge.post.ts` *simulent* la confirmation opérateur ; `FLOOZ_API_KEY` / `TMONEY_API_KEY`
ne sont pas encore lus (cf. `.env.example`). C'est assumé et documenté, mais tant que ce n'est pas
branché, **aucun euro/FCFA réel ne transite** : le produit n'est pas monétisable en l'état.
*Solution :* intégrer les SDK/API sandbox Flooz & T-Money (ou un agrégateur type PayGate/CinetPay/Semoa
qui couvre les deux au Togo), et ne confirmer un paiement que sur webhook signé de l'opérateur.

**M2. Pas d'attribut `lang` sur `<html>`.** `app/app.vue` et `nuxt.config.ts` ne définissent aucun
`htmlAttrs.lang`. Impact SEO + lecteurs d'écran (prononciation). *Solution :*
```ts
// nuxt.config.ts → app.head
htmlAttrs: { lang: 'fr' }
```

**M3. Polices chargées depuis le CDN Google (`fonts.googleapis.com` / `fonts.gstatic.com`).**
Double problème : (a) **RGPD/protection des données** — chaque visite transmet l'IP du visiteur à Google
(jurisprudence UE, pertinent vu votre page confidentialité) ; (b) **performance** — feuille de style
externe bloquante + connexion tierce. *Solution :* auto-héberger Poppins (npm `@fontsource/poppins`
ou fichiers `.woff2` dans `/public/fonts`) et `font-display: swap`. Supprime aussi 2 `preconnect`.

**M4. Robustesse des webhooks.** `JSON.parse(rawBody)` n'est pas enveloppé dans un `try/catch` : un corps
signé mais non-JSON lève une 500 non maîtrisée. La signature est vérifiée (bien), mais il manque une
protection **anti-rejeu** (timestamp/nonce) : un webhook valide capturé peut être rejoué tant que le
paiement est `pending`. *Solution :* `try/catch` autour du parse + inclure un `timestamp` dans la charge
signée et rejeter au-delà de X minutes.

**M5. `readBody` sans validation Zod systématique.** Zod est dans les dépendances et utilisé par endroits,
mais plusieurs handlers (`session.post.ts`, webhooks) typent le corps « à la main » via une interface TS
(pas de validation à l'exécution). Un corps malformé passe la barrière de typage. *Solution :* un schéma
Zod par endpoint muté, appliqué en entrée (`schema.parse(await readBody(event))`).

**M6. En-têtes de sécurité HTTP absents.** Pas de CSP, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`/`frame-ancestors`, HSTS. *Solution :* `nuxt-security` ou un middleware Nitro
`server/middleware/security.ts` posant ces en-têtes (CSP à durcir progressivement).

---

### 🟡 MINEUR

- **m1.** 1 `<img>` sur 3 sans `alt` (2 `alt=` pour 3 `<img>`). Fournir un `alt` (ou `alt=""` si décoratif).
- **m2.** SQLite en dev *et* implicitement en prod si `DATABASE_URL` non changé : prévoir Postgres/MySQL
  managé (Neon, Supabase, PlanetScale) pour la prod — SQLite tient mal la concurrence d'écriture.
- **m3.** `scroll-behavior: smooth` global : à neutraliser sous `prefers-reduced-motion` (voir Partie 2).
- **m4.** Le thème est appliqué via un `innerHTML` inline dans `<head>` (anti-flash) — OK, mais une CSP
  stricte le bloquera : prévoir un `nonce` ou externaliser.
- **m5.** Gestion d'erreurs front : `app/utils/apiErrorMessage.ts` existe (bien), vérifier qu'aucun
  `catch` ne reste silencieux et que chaque appel réseau a un état d'erreur visible utilisateur.

## 1.2 Comparaison avec Upwork / Fiverr / Malt / Freelancer / ComeUp / 99designs

Ce que ces plateformes ont et qui **manque ou reste embryonnaire** ici :

| Standard du secteur | Upwork/Fiverr/Malt… | WorkTogo |
|---|---|---|
| **Paiement réel + escrow opérationnel** | ✅ cœur du modèle | 🔴 escrow *simulé* + non persistant |
| **Résolution de litige structurée** | ✅ médiation, preuves, délais | 🟢 présent (`DisputeMediationPanel`, preuves check-in/out) — bon point |
| **Système d'avis vérifiés (post-prestation)** | ✅ | 🟢 présent (#285 avis liés à prestation payée) |
| **Vérification d'identité / KYC** | ✅ | 🟢 amorcé (`IdentityVerificationForm`, badge Vérifié) |
| **Recherche + filtres + matching** | ✅ | 🟢 présent (scoring, multicritères, distance GPS) |
| **Messagerie intégrée + anti-contournement** | ✅ (Fiverr masque les coordonnées) | 🟢 présent (`contournementAttemptStore`, masquage) — remarquable |
| **Notifications (email/SMS/push) temps réel** | ✅ | 🟠 OTP oui, mais pas de centre de notifications transactionnelles |
| **App mobile / PWA installable** | ✅ | 🔴 pas de manifest PWA ni build APK (le prompt parle d'APK) |
| **Profils publics indexables (SEO) + sitemap** | ✅ | 🟠 SSR oui, mais pas de `sitemap.xml`/`robots.txt`/données structurées |
| **Internationalisation (FR/EN + langues locales)** | ✅ | 🔴 mono-langue FR en dur (pas de `@nuxtjs/i18n`) |
| **Tableau de bord revenus/facturation prestataire** | ✅ | 🟠 solde/retrait présents, facturation PDF absente |
| **Programme de parrainage / acquisition** | ✅ | 🔴 absent |

**Priorités concurrentielles à ajouter :** (1) paiement réel + persistance, (2) PWA installable
(remplace un vrai APK à moindre coût, `@vite-pwa/nuxt`), (3) SEO technique (sitemap, robots, JSON-LD
`LocalBusiness`/`Service`), (4) centre de notifications, (5) facturation/reçus PDF.

---

# PARTIE 2 — Audit design (casquette : Designer UX/UI)

## 2.1 Le design est-il beau, doux, élégant, animé ? — Réponse honnête

**Oui, la base est solide et cohérente.** Le design system est réel (`app/assets/css/main.css`) :
palette de marque verte maîtrisée (`--color-primary: #14A800`, proche du vert Upwork — bon
positionnement sectoriel), échelle d'ombres à 3 niveaux, rayons cohérents (pill/card/field),
typographie Poppins, transitions de page globales, `data-reveal` (apparition au scroll en
`cubic-bezier(0.16,1,0.3,1)` — courbe « soft » de qualité), `.lift` au survol, focus-visible unifié,
et surtout `prefers-reduced-motion` respecté à 3 endroits. C'est **au-dessus de la moyenne**.

Ce n'est pas « fade » — mais ce n'est pas encore au niveau *Awwwards / Cuberto / Codrops* que vous visez.
Ce qui sépare « propre » de « mémorable » :

## 2.2 Améliorations concrètes (dans le thème actuel, sans dénaturer)

**D1. Hiérarchie typographique plus expressive.** Poppins 400→800 est chargé mais le hero gagnerait
à un contraste d'échelle plus fort (titre `clamp(2.5rem, 6vw, 4.5rem)`, `letter-spacing: -0.02em`,
`line-height: 1.05`) pour l'effet « éditorial » des références citées.

**D2. Micro-interactions manquantes.** Ajouter : transition d'état sur les boutons (scale 0.98 au
`:active`), soulignés animés déjà amorcés (`d182074`) à généraliser aux liens de nav, et un feedback
haptique visuel sur les CTA principaux (halo qui pulse une fois au montage).

**D3. Rythme d'animation à l'échelle de la page.** Les `data-reveal` sont bien, mais orchestrer une
**cascade** (`--reveal-delay` incrémental par enfant) sur les grilles (secteurs, cartes prestataires,
tarifs) donne l'effet « godly.website ». Déjà partiellement fait (`6bdf24c`) — à étendre.

**D4. Respecter `prefers-reduced-motion` aussi pour `scroll-behavior`** (voir m3) :
```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  [data-reveal] { transition: none; opacity: 1; transform: none; }
}
```

**D5. États vides & squelettes.** `ResultsSkeleton`, `ResultsEmptyState` existent (excellent). Étendre
la même finition aux dashboards, messagerie et portefeuille (shimmer déjà présent, `d182074`).

**D6. Profondeur & douceur.** Introduire des dégradés très subtils sur les surfaces (fond de hero en
`radial-gradient` vert quasi-transparent — le « halo de hero » est mentionné en commentaire, à pousser),
et des bordures `1px` en `--color-hairline` plutôt que des ombres dures partout → effet « soft ».

**D7. Cohérence mobile/desktop.** Le responsive existe (#50). Vérifier les zones tactiles ≥ 44px, la
barre `FavoritesMessagingBar` fixe (ne pas masquer le contenu bas de page — `padding-bottom` de sécurité),
et les mega-menus (survol) → équivalent tap sur mobile.

**Références applicables :** cascade au scroll (Codrops/godly), curseur magnétique — déjà tenté (#226)
puis reverti : à re-tenter proprement *derrière* `prefers-reduced-motion` et *pointer: fine* uniquement
(jamais sur tactile). L'esthétique Cuberto = beaucoup d'espace blanc + une seule animation forte par
écran, pas dix petites.

## 2.3 Accessibilité (transversal design + dev)

Bon socle (`docs/accessibility-audit.md`, `--color-muted` renforcé, 60 `aria-label`). Restent :
attribut `lang` (M2), `alt` manquant (m1), vérifier le contraste du vert `#14A800` sur blanc pour le
**texte** (ratio ~2.9:1 → **insuffisant en AA pour du petit texte** ; OK en gros/gras ou comme couleur de
fond de bouton avec texte blanc — à auditer au cas par cas), et la navigation clavier des mega-menus.

---

# PARTIE 3 — Audit juridique (casquette : Juriste — droit togolais)

## 3.1 Constat : les pages existent déjà

Les pages demandées sont **déjà présentes et de bonne facture** :
`app/pages/{faq,aide,contact,reclamation,mentions-legales,cgu,confidentialite,cookies}.vue`,
alimentées par `app/data/legalPages/*.ts`. Le contenu CGU lu (positionnement d'**intermédiaire
technique**, escrow, quotas, abonnement, vérification d'identité, capacité de contracter) est
**juridiquement sérieux** — clairement rédigé avec une conscience du droit de la consommation et du RGPD.

Mon rôle n'est donc pas de tout réécrire mais de **fiabiliser les références au droit togolais** et de
combler les manques. ⚠️ **Avertissement de méthode : je n'invente aucune référence légale.** Là où je
ne suis pas certain de l'intitulé ou du numéro exact d'un texte togolais, je le signale explicitement —
une validation par un **avocat inscrit au Barreau du Togo** reste indispensable avant publication.

## 3.2 Cadre togolais pertinent (à faire confirmer par un avocat local)

- **Protection des données personnelles :** Loi n° **2019-014** du 29 octobre 2019 relative à la
  protection des données à caractère personnel, et l'autorité de contrôle **IPDCP** (Instance de
  Protection des Données à Caractère Personnel). ➜ Toute page « Confidentialité » doit citer un
  **responsable de traitement identifié**, la base légale, les droits (accès/rectification/effacement/
  opposition/portabilité), la durée de conservation, et **la possibilité de saisir l'IPDCP**.
  *À confirmer : formalité de déclaration/autorisation préalable auprès de l'IPDCP pour votre traitement.*
- **Commerce électronique / société de l'information :** le Togo dispose d'un cadre sur les transactions
  électroniques (**Loi n° 2017-007 sur les transactions électroniques**, à confirmer) et la
  **cybersécurité** (Loi n° 2018-026 sur la cybersécurité et la lutte contre la cybercriminalité,
  intitulé à vérifier). ➜ Mentions légales : identification de l'éditeur, hébergeur, directeur de
  publication.
- **Protection du consommateur :** *je ne suis pas certain de l'existence d'une loi togolaise
  consumériste unifiée récente* — le droit OHADA (Acte uniforme sur le droit commercial général) régit
  l'intermédiation commerciale. ➜ **À faire vérifier** : droit de rétractation applicable, obligation
  d'information précontractuelle, règlement des litiges de consommation.
- **Fiscalité prestataires / plateforme :** régime OTR (Office Togolais des Recettes), TVA éventuelle
  sur la commission plateforme. ➜ Vous avez déjà une branche `#287-obligations-fiscales-prestataires`,
  bon réflexe. **À confirmer par un fiscaliste.**
- **Monnaie & mobile money :** encadrement **BCEAO/UEMOA** des services de paiement et de la monnaie
  électronique (Flooz/T-Money = émetteurs de monnaie électronique agréés). ➜ En hébergeant un
  **portefeuille avec solde**, vérifiez si votre activité relève d'un statut d'agent/établissement de
  paiement, ou si vous restez « donneur d'ordre » via l'opérateur. **Point juridiquement sensible n°1.**

## 3.3 Manques / renforcements à apporter aux pages existantes

1. **Mentions légales :** vérifier qu'y figurent l'identité complète de l'éditeur (raison sociale, forme,
   RCCM, siège, capital, représentant légal), l'hébergeur, un contact, et le **N° d'identification
   fiscale (NIF)**. Champs déjà centralisés dans `app/data/companyInfo.ts` — à compléter avec les vraies
   valeurs (aujourd'hui probablement des placeholders).
2. **Confidentialité :** ajouter la mention **IPDCP** + base légale (Loi 2019-014) + DPO/point de contact
   données + durées de conservation par catégorie. Vous avez `DataPrivacyPanel`, `account/export`,
   `account/delete` (droit d'accès/effacement techniquement implémentés — excellent, rare).
3. **Cookies :** page présente ; s'assurer qu'un **bandeau de consentement réel** conditionne le dépôt
   de cookies non essentiels (Sentry/analytics) **avant** dépôt (consentement préalable). Le chargement
   des Google Fonts (M3) est aussi un transfert de données à traiter ici.
4. **CGU :** le point escrow/portefeuille doit être aligné avec le statut BCEAO (3.2). Clarifier qui
   détient les fonds pendant le séquestre (compte de cantonnement chez l'opérateur ?).
5. **Réclamation / litige :** la page existe (`reclamation.vue`, `complaintStore`, `complaintCategories`).
   Ajouter les **délais de réponse** et la voie de médiation/juridiction compétente (tribunaux togolais,
   droit applicable = droit togolais) — clause déjà partiellement dans les CGU à confirmer.

> **Résumé juriste :** le socle est bon et honnête (positionnement d'intermédiaire bien tenu, droits RGPD
> réellement outillés). Les 3 points à ne pas négliger : **(1)** statut BCEAO du portefeuille escrow,
> **(2)** conformité IPDCP/Loi 2019-014 nommément citée, **(3)** valeurs réelles dans les mentions légales.
> **Tout ce qui précède doit être relu par un avocat togolais avant mise en ligne.**

---

# SYNTHÈSE DES PRIORITÉS

| # | Priorité | Casquette | Gravité | Effort |
|---|---|---|---|---|
| 1 | Persister wallet/escrow/paiements/abonnements sur Prisma (C1) | Dev | 🔴 | Élevé |
| 2 | Statut juridique BCEAO du portefeuille + IPDCP (3.2) | Juriste | 🔴 | Externe (avocat) |
| 3 | Intégration paiement réelle Flooz/T-Money (M1) | Dev | 🟠 | Élevé |
| 4 | `lang="fr"`, `alt`, reduced-motion scroll, en-têtes sécurité (M2/M4/M6/m1/m3) | Dev/Design | 🟠 | **Faible** |
| 5 | Auto-héberger les polices (M3) — RGPD + perf | Dev/Juriste | 🟠 | Faible |
| 6 | SEO technique (sitemap/robots/JSON-LD) + PWA installable | Dev | 🟠 | Moyen |
| 7 | Micro-interactions & cascade d'animations (D1–D6) | Design | 🟡 | Moyen |
| 8 | Compléter `companyInfo.ts` + mentions IPDCP dans les pages | Juriste | 🟡 | Faible |

**Quick wins (faible effort, fort impact, sans risque) :** #4 + #5 + #8 — parfaits pour une première PR.

---

*Fin de l'audit. La mise en pratique (branche + PR) est décrite séparément.*
