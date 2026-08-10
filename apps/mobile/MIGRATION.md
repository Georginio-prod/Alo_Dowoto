# MIGRATION.md — WorkTogo / Alo Dowoto : Nuxt → React Native (Expo)

> Référence de parité et preuve de reprise. Rédigé en Phase 0 à partir du code
> **réel** de l'application Nuxt (`Alo_Dowoto/`). Aucune valeur n'a été inventée :
> chaque jeton, chemin d'API et contrat provient du dépôt existant.

## 0. Nature de l'« application mobile » actuelle (déterminant pour la suppression)

L'app mobile existante n'est **pas** un projet séparé. Elle est constituée de
deux morceaux, dont un **partagé avec le site web** :

| Élément | Emplacement | Partagé avec le web ? | Verdict suppression |
|---|---|---|---|
| Coquille Capacitor (charge le web Nuxt via IP LAN) | `mobile/` (`capacitor.config.json`, `android/`, `www/`) | **Non** — exclusivement mobile | Supprimable (Phase 6) |
| Écrans onboarding mobile | `app/pages/m/welcome.vue`, `app/pages/m/auth.vue` | **Oui** — vivent dans le projet Nuxt du site | **Ne pas supprimer sans vérif build web** — listés, non supprimés |
| Redirection `/dashboard` non connecté → `/m/welcome` | logique dans le layout/middleware Nuxt | **Oui** | À ne pas toucher |

Conséquence : conformément à la règle « en cas de doute, ne pas supprimer », seule
la coquille `mobile/` (Capacitor + `android/` généré) est un candidat sûr à la
suppression. Les pages `app/pages/m/*` sont **listées** au rapport final pour
arbitrage, pas supprimées.

---

## 1. Écrans & routes de l'app Nuxt (parcours indiqué)

Source : `app/pages/**`. Parcours : **C** = commun, **U** = chercheur (rôle
backend `client`), **P** = prestataire.

| Route Nuxt | Rôle | Parcours | Écran RN équivalent (app/) |
|---|---|---|---|
| `index.vue` | Accueil public / recherche | C/U | `(chercheur)/index` (accueil+recherche) |
| `m/welcome.vue` | Onboarding : choix du rôle | C | `(auth)/welcome` |
| `m/auth.vue` | Onboarding : connexion/inscription | C | `(auth)/login`, `(auth)/register` |
| `auth.vue` | Auth web | C | `(auth)/login` |
| `mot-de-passe.vue` | Création/saisie mot de passe | C | `(auth)/password` |
| *(code OTP, inline dans auth)* | Vérification code 6 chiffres | C | `(auth)/verify` |
| `categories/index.vue` | Liste des catégories | U | `(chercheur)/categories` |
| `categories/[slug].vue` | Catégorie détaillée | U | `(chercheur)/categories/[slug]` |
| `resultats.vue` | Résultats géolocalisés | U | `(chercheur)/resultats` |
| `matching/[id].vue` | Profil prestataire / matching | U | `(chercheur)/prestataire/[id]` |
| `demande.vue` | Fiche préalable 3 étapes + estimation | U | `(chercheur)/demande` |
| `formules.vue` | Comparatif des formules | C | `(chercheur)/formules` |
| `paiement.vue` | Paiement de l'avance (escrow) | U | `(chercheur)/paiement/[id]` |
| `dashboard/index.vue` | Tableau de bord | C | redirige vers onglets par rôle |
| `dashboard/client.vue` | Tableau de bord chercheur | U | `(chercheur)/index` |
| `favoris.vue` | Favoris | U | `(chercheur)/favoris` |
| `messages/index.vue` | Liste des conversations | C | `(chercheur)/messages`, `(prestataire)/messages` |
| `messages/[id].vue` | Fil de conversation + suivi mission | C | `messages/[id]` |
| `prestataire/index.vue` | « Aujourd'hui » prestataire | P | `(prestataire)/index` |
| `prestataire/demandes.vue` | Demandes entrantes | P | `(prestataire)/demandes` |
| `prestataire/solde.vue` | Revenus / solde | P | `(prestataire)/revenus` |
| `prestataire/profil-professionnel.vue` | Profil public | P | `(prestataire)/profil` |
| `prestataire/cv.vue`, `certifications.vue`, `formation.vue`, `langues.vue`, `coordonnees.vue`, `preferences.vue` | Sous-écrans profil pro | P | `(prestataire)/profil/*` |
| `abonnement.vue` | Abonnement (plans mensuel/trim./annuel) | P | `(prestataire)/abonnement` |
| `solde.vue` | Portefeuille / recharge | C | `(chercheur)/portefeuille` |
| `profil.vue` | Profil utilisateur | C | `(chercheur)/profil`, `(prestataire)/profil` |
| `profil/identite.vue`, `profil/verification.vue` | Identité / vérification KYC | C | `profil/verification` |
| `parrainage.vue` | Parrainage | C | `parrainage` |
| `reclamation.vue` | Réclamation | C | `reclamation` |
| `aide.vue`, `faq.vue`, `contact.vue` | Aide / FAQ / Contact | C | `aide`, `faq` |
| `a-propos.vue` | À propos / comment ça marche | C | `comment-ca-marche` |
| `cgu.vue`, `confidentialite.vue`, `cookies.vue`, `mentions-legales.vue` | Pages légales | C | `legal/[slug]` (données `app/data/legalPages`) |

---

## 2. Jetons de design RÉELS (relevés dans `app/assets/css/main.css`)

Ne pas réinventer — valeurs exactes du code.

### Couleurs (thème clair, défaut)
| Jeton | Valeur | Usage |
|---|---|---|
| `--color-primary` | `#14A800` | Vert de marque WorkTogo |
| `--color-primary-hover` | `#109300` | Survol/pressed primaire |
| `--color-dark` | `#0F2318` | Anthracite (CTA sombres, texte emphase) |
| `--color-dark-hover` | `#1A3A28` | Survol CTA sombre |
| `--color-bg` | `#F7F7F7` | Fond de page |
| `--color-surface` | `#FFFFFF` | Cartes, header, panneaux |
| `--color-ink` | `#1A1A1A` | Texte principal |
| `--color-muted` | `#5C626E` | Texte secondaire / libellés |
| `--color-hairline` | `rgba(15,35,24,0.08)` | Filets, bordures |
| `--color-error` | `#D64545` | Erreur |
| `--color-star` | `#E6A700` | Étoiles / notation |

Thème sombre « northern » (`themes.css`) repris comme mode sombre :
`primary #38C15E`, `bg #1A2430`, `surface #212D3B`, `ink #E6EDF3`, `muted #8A97A6`,
`error #EA4B41`, `star #E6A700`.

### Typographie
- Famille : **Poppins** (auto-hébergée `@fontsource/poppins`, poids 400/500/600/700/800).
- Échelle assainie (Phase 2) : 24 / 20 / 16 / 14 / 12, corps ≥ 16 px, interligne 1,5, deux graisses (400 / 700).

### Rayons
`--radius-pill 999px` · `--radius-card 16px` · `--radius-field 10px`.

### Ombres
- `card-sm` : `0 1px 3px rgba(15,35,24,0.06)`
- `card-md` : `0 4px 12px rgba(15,35,24,0.08), 0 2px 4px rgba(15,35,24,0.04)`
- `card-lg` : `0 12px 32px rgba(15,35,24,0.12), 0 4px 8px rgba(15,35,24,0.05)`

### Espacement (échelle de 4 imposée Phase 2)
`4, 8, 12, 16, 24, 32, 48`.

---

## 3. Contrat d'API (backend inchangé — `server/api/**`)

Base URL configurable (`EXPO_PUBLIC_API_URL`). ~80 endpoints. Extrait des plus
structurants ; liste exhaustive dans `src/features/*/api.ts`.

### Authentification
| Méthode | Chemin | Corps | Réponse |
|---|---|---|---|
| POST | `/api/auth/otp/send` | `{ method, value }` | `{ ok }` (envoi code SMS/email) |
| POST | `/api/auth/otp/verify` | `{ method, value, code }` | `{ ok }` (marque contact vérifié) |
| POST | `/api/auth/session` | `{ method, value, role, username?, firstName?, lastName?, location?, latitude?, longitude?, referralCode?, password? }` | `{ user }` + **Set-Cookie `wt_session`** |
| GET | `/api/auth/session` | — | `{ user }` |
| DELETE | `/api/auth/session` | — | déconnexion (efface cookie) |
| POST | `/api/auth/password` | `{ password }` | crée le mot de passe (#125) |
| PATCH | `/api/auth/profile` | champs profil | `{ user }` |

### Demandes (chercheur)
| POST | `/api/requests` | `{ title, skills[], description, budgetMax, urgency('immediate'\|'semaine'\|'flexible'), location, sector? }` | `201 { request, matches[] }` |
| GET | `/api/requests` / `/api/requests/[id]` / `/api/requests/[id]/matches` | — | demandes & matchs |
| GET | `/api/requests/received` | — | demandes reçues (prestataire) |

### Prestataires / recherche
`GET /api/providers/search`, `/api/providers/[id]`, `/api/providers/featured`,
`/api/providers/me`, `PATCH /api/providers/me`, `/api/providers/availability`.

### Missions / escrow (`/api/conversations/[id]/*`)
`pay`, `check-in`, `check-out`, `deliver`, `receive`, `dispute`, `respond-dispute`,
`confirm-order`, `propose-reschedule`, `confirm-reschedule`, `review`,
`share-location`, `cancel`, `client-cancel`, `first-contact`, `messages`.

### Paiements / portefeuille / abonnements
`POST /api/payments/initiate`, `GET /api/payments/me`, `/api/payments/[id]`,
`/api/payments/[id]/receipt` ; `GET /api/wallet/me`, `POST /api/wallet/recharge` ;
`GET /api/subscriptions/me`, `POST /api/subscriptions`, `POST /api/subscriptions/trial`.

### Divers
`favorites`, `notifications`, `quotas/contacts`, `quotas/requests-received`,
`reviews/me`, `referrals/me`, `verification`, `testimonials`, `reclamations`,
`sectors/counts`.

---

## 4. Mécanisme d'authentification (à répliquer à l'identique)

- **Cookie de session** `wt_session` (`server/utils/userStore.ts`), défini via
  `setCookie` sur `POST /api/auth/session`, `maxAge` **30 jours**.
- Lecture serveur : `getCookie(event, 'wt_session')` uniquement — **aucun
  support d'en-tête `Authorization`/Bearer**.
- **Conséquence mobile** : le client RN doit capturer l'en-tête `Set-Cookie`
  après login, stocker le token dans **expo-secure-store**, puis renvoyer
  `Cookie: wt_session=<token>` sur chaque requête. Déconnexion = `DELETE
  /api/auth/session` + purge SecureStore.
- Rôles backend : `client` (UI « chercheur ») et `prestataire`. Le contrôle
  d'accès (`requireClientRole` / `requireProviderRole`) est côté serveur.

---

## 5. Ressources à reprendre
Logo & icônes : `public/` (Nuxt). Police : Poppins. Vidéo d'accueil onboarding :
référencée par `m/welcome.vue` (tailleur, attribution légale). Icônes de secteur :
`app/utils/sectorIcons.ts`. → copiées/référencées dans `assets/`.

## 6. Textes UI
`i18n/locales/fr.json` (1740 lignes) et `en.json` — repris comme base de
`src/i18n/fr.json` / `en.json`.

## 7. Logique métier extraite (→ `src/features/*/utils.ts`, testée)
- **Formules d'abonnement prestataire** (`app/data/plans.ts`) : `mensuel 5 000
  FCFA/30j`, `trimestriel 13 500 FCFA/90j` (badge), `annuel 48 000 FCFA/365j`
  (badge, mise en avant). Essai gratuit 14 j. Quotas de demandes/mois : 5 / 20 /
  illimité.
- **Cycle escrow** (`server/utils/escrowOrderStore.ts`) : `awaiting_payment →
  in_escrow → delivered → released` (+ `refunded`, `disputed`). Max
  **2** commandes non payées simultanées (`MAX_SIMULTANEOUS_UNPAID_ORDERS`).
- **Urgence de demande** : `immediate | semaine | flexible`.
- **Devise** : FCFA (XOF), format « 5 000 FCFA » (séparateur milliers, entier).
- Estimation en direct de la fiche préalable : budget max + secteur + urgence.

---

## 7bis. État de vérification (mesuré)
- `npx tsc --noEmit` → **0 erreur**.
- `npx eslint .` → **0 erreur**.
- `npx jest` → **16/16 tests verts** (tarification, machine à états escrow,
  extraction du jeton `wt_session`, distance géo).
- `npx expo config` → configuration valide (scheme `worktogo`, nouvelle archi).
- **APK** : non buildé ici (pas de NDK, non installable sans `cmdline-tools`).
  Voir `apk/README.md` — build local (après ajout du NDK) ou EAS cloud.
- Ancienne coquille Capacitor `mobile/` **supprimée** (commit dédié, revertable) ;
  site web/backend non touchés.

## 8. Table de parité (voir Phase 7 du rapport pour le statut final par écran)
Colonne « statut » renseignée à la livraison : *repris* / *amélioré* / *supprimé
volontairement*. Objectif : chaque route Nuxt du §1 a un équivalent RN.
