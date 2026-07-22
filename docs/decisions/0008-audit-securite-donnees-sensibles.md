# ADR 0008 — Audit de sécurité du stockage des données sensibles

**Statut :** Adopté (2026-07-21)
**Contexte :** issue #286 (« Conformité protection des données personnelles »)

## Contexte

La plateforme manipule des catégories de données particulièrement
sensibles : localisation, pièces d'identité (carte d'identité + photo
passeport), historique de paiement. Cet audit couvre le stockage actuel de
ces données (schéma Prisma pour `User`/`Session`/`OtpCode`/`VerifiedContact`,
stores en mémoire pour tout le reste, voir #45/#46) et documente les
correctifs appliqués suite à ses conclusions.

## Périmètre audité

1. Documents de vérification d'identité (`server/utils/verificationStore.ts`)
2. Données de géolocalisation (`User.latitude`/`longitude`, Prisma)
3. Données de paiement (`server/utils/paymentStore.ts`, `walletStore.ts`,
   `subscriptionStore.ts`, `escrowOrderStore.ts`, modèle Prisma `Payment`)
4. Mot de passe et session (`server/utils/password.ts`, cookie `wt_session`)
5. Mitigations anti-fuite déjà en place (`contactMask.ts`,
   `contournementDetector.ts`)
6. Autres stores en mémoire portant des données personnelles en passant
   (`complaintStore.ts`, `contournementAttemptStore.ts`, `reviewStore.ts`)

## Constats et correctifs

### 1. Documents de vérification d'identité — gap le plus sévère, corrigé

**Constat :** `idCardImage`/`passportPhotoImage` étaient stockées en clair
(data URL base64) dans un `Map` en mémoire, sans aucune limite de
conservation ni mécanisme d'effacement — une fois soumises, ces images
(la catégorie de donnée la plus sensible de l'application) restaient
indéfiniment accessibles. Point positif déjà en place : les deux seules
routes qui lisent ces données (`server/api/verification/index.post.ts`,
`server/api/verification/me.get.ts`) sont strictement bornées à
l'utilisateur connecté, et `me.get.ts` ne renvoie d'ailleurs jamais les
images elles-mêmes — aucune fuite inter-utilisateurs constatée.

**Correctif appliqué :**
- Purge automatique des images 90 jours après soumission
  (`ID_DOCUMENT_RETENTION_MS`, `verificationStore.ts`), sans jamais révoquer
  le statut « Vérifié » déjà acquis (`isVerified` ne dépend que de la
  présence de l'enregistrement, pas des images).
- Nouvelle fonction `deleteVerification(userId)` : effacement complet à la
  demande, câblée sur le nouveau droit à l'effacement en libre-service
  (voir point 2).

### 2. Absence de mécanisme de suppression de compte — corrigé

**Constat :** aucune route d'export ou de suppression de compte n'existait
nulle part dans l'application — la politique de confidentialité promettait
un droit d'accès/portabilité/effacement, mais son exercice nécessitait un
contact manuel par e-mail, sans garantie de délai ni de mécanisme technique
réel.

**Correctif appliqué :**
- `GET /api/account/export` : export JSON des données du compte connecté
  (profil, profil prestataire, abonnement, solde portefeuille, statut de
  vérification) — n'inclut jamais les images de vérification brutes.
- `POST /api/account/delete` : anonymise le compte (`anonymizeUser`,
  `server/utils/userStore.ts`) plutôt que de supprimer la ligne — l'historique
  financier (`Payment`, `Subscription`) est conservé pour les obligations
  comptables/fiscales (cohérent avec la politique de confidentialité), mais
  n'est plus rattachable à une identité réelle une fois `contact`,
  `username`, `firstName`, `lastName`, `location`, `latitude`, `longitude`
  et `passwordHash` neutralisés et toute session invalidée. Les images de
  vérification sont effacées dans le même geste (`deleteVerification`).
- Les deux routes sont exposées en libre-service depuis le hub `/profil`
  (section « Mes données », `DataPrivacyPanel.vue`).

### 3. Géolocalisation précise — documenté, pas de correctif immédiat

**Constat :** `User.latitude`/`longitude` (coordonnées GPS réelles,
capturées en option à l'inscription) ne sont jamais exposées à un autre
utilisateur — confirmé par grep : absentes de `ProviderSearchResult`,
`ProviderDetail` et de toute réponse API autre que la vue du compte lui-même
(`toPublicUser`). Leur finalité (tri des résultats de recherche par
distance) est en cours de câblage séparément (#263). Elles sont effacées
comme le reste des données identifiantes lors d'une suppression de compte
(point 2).

**Décision :** pas de correctif dédié supplémentaire dans cette itération —
le risque résiduel (collecte sans usage immédiat tant que #263 n'est pas
fusionné) est faible en l'absence de toute exposition à des tiers, et sera
résorbé naturellement une fois #263 fusionné.

### 4. Données de paiement — déjà conforme

**Constat :** aucun code secret, PIN ou identifiant Mobile Money complet
n'est jamais stocké — uniquement le numéro de téléphone utilisé pour la
transaction (nécessaire au rapprochement) et une référence opérateur
(`Payment.phone`/`operatorRef`, `paymentStore.ts` et modèle Prisma
correspondant). `payoutMethod` n'est qu'une énumération (`flooz`/`tmoney`/
`virement`), jamais un numéro de compte. Aucun correctif nécessaire.

### 5. Mot de passe et session — déjà conforme

**Constat :** mots de passe hachés avec `scrypt` (sel aléatoire 16 octets,
comparaison en temps constant via `timingSafeEqual`, `server/utils/password.ts`).
Cookie de session (`wt_session`) systématiquement posé avec `httpOnly`,
`sameSite: 'lax'`, et `secure` en production. Jetons de session
(`randomUUID`) à durée de vie limitée (30 jours), invalidés à la
déconnexion. Aucun correctif nécessaire.

### 6. Autres stores portant des données personnelles en passant

**Constat :** `complaintStore.ts` (réclamations, avec e-mail de contact) et
`contournementAttemptStore.ts` (extraits de messages bloqués par le filtre
anti-contournement, contenant potentiellement les numéros/e-mails qu'ils
visent justement à empêcher de fuiter) n'ont aucune limite de conservation
ni interface de purge — mais aucune route ne les expose publiquement
aujourd'hui (aucun panneau d'administration n'existe dans ce prototype, voir
ADR 0007 sur le signalement du contournement).

**Décision :** consigné comme suivi ultérieur plutôt que traité dans cette
itération — le risque est plus faible (pas de route d'exposition, données
non biométriques) que celui des pièces d'identité, et un mécanisme de purge
dédié mérite sa propre issue plutôt que d'être ajouté à la hâte ici.

## Résumé

| Donnée | Avant | Après |
| --- | --- | --- |
| Pièces d'identité | Conservées indéfiniment | Purgées automatiquement à 90 jours |
| Droit à l'effacement | Contact e-mail manuel, aucune route | `POST /api/account/delete`, libre-service |
| Droit à la portabilité | Contact e-mail manuel, aucune route | `GET /api/account/export`, libre-service |
| Géolocalisation | Jamais exposée à des tiers | Inchangé (déjà conforme), effacée à la suppression du compte |
| Paiement | Aucun secret stocké | Inchangé (déjà conforme) |
| Mot de passe / session | scrypt + cookie sécurisé | Inchangé (déjà conforme) |

## Hors périmètre de ce document

La purge de `complaintStore.ts`/`contournementAttemptStore.ts` (point 6) et
la construction d'une interface d'administration pour gérer ces données
restent hors périmètre — signalées ici comme suivi ultérieur plutôt
qu'ouvertes en tant que nouvelles issues dans l'immédiat.
