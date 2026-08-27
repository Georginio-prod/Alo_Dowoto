# ADR 0007 — Procédure de traitement d'un signalement de contournement

**Statut :** Adopté (2026-07-21)
**Contexte :** issue #269 (« Sanctions contractuelles en cas de contournement avéré »)

## Contexte

Les CGU (`app/data/legalPages/cgu.ts`, article 15) prévoient désormais
explicitement qu'un contournement avéré de la plateforme peut entraîner une
suspension ou résiliation immédiate, sans remboursement. Ce document décrit
la procédure interne que l'équipe support doit suivre pour vérifier un
signalement avant d'appliquer une sanction — les CGU exigent explicitement
qu'aucune sanction ne soit automatique.

## Sources d'un signalement

1. **Détection automatique** — `server/utils/contournementAttemptStore.ts`
   (#265) journalise chaque message bloqué par le filtre anti-contournement
   (`server/utils/contournementDetector.ts`) : numéro de téléphone, e-mail,
   ou mention de paiement hors plateforme. Consultable via
   `listContournementAttemptsForUser(userId)`.
2. **Signalement manuel** — un chercheur ou un prestataire qui constate un
   contournement (ex. un prestataire proposant explicitement de continuer
   hors plateforme) le signale au support. Aucune interface dédiée
   n'existe aujourd'hui dans le produit ; le canal actuel est le contact
   support déjà utilisé pour toute autre demande (voir la page Assistance).

## Procédure de vérification (avant toute sanction)

1. **Rassembler le contexte** : historique complet des messages de la
   conversation concernée (`getMessages`, `server/utils/conversationStore.ts`),
   tentatives journalisées pour cet utilisateur
   (`listContournementAttemptsForUser`), et statut de la ou des commandes
   escrow associées (`getEscrowOrderByConversationId`).
2. **Distinguer un faux positif d'un contournement réel** : le filtre
   automatique (#265) est volontairement permissif — il peut bloquer un
   message légitime (ex. un numéro de téléphone cité par erreur, une date
   contenant beaucoup de chiffres). Une tentative bloquée n'est **jamais**,
   à elle seule, une preuve de contournement avéré : elle déclenche une
   vérification, pas une sanction.
3. **Rechercher un pattern de contournement réel** : messages répétés
   proposant explicitement un règlement hors plateforme, coordonnées
   échangées puis absence de commande escrow créée alors qu'une prestation
   a manifestement eu lieu (ex. avis publié sans commande `released`
   correspondante — désormais impossible pour un nouvel avis depuis #285,
   mais reste pertinent pour l'historique antérieur).
4. **Contacter l'utilisateur concerné** avant toute sanction définitive, sauf
   récidive déjà documentée ou preuve manifeste (aveu explicite dans un
   message, par exemple) — cohérent avec la graduation prévue à l'article 15
   des CGU (avertissement avant suspension/résiliation, sauf urgence ou
   récidive).
5. **Documenter la décision** : motif, preuves consultées, sanction
   appliquée (avertissement, suspension temporaire avec durée, résiliation
   définitive) — pour permettre une contestation ultérieure par l'utilisateur
   et une cohérence entre les décisions de l'équipe support dans le temps.

## Hors périmètre de ce document

Aucune interface d'administration dédiée n'existe dans le produit pour
dérouler cette procédure (pas de rôle « support »/« admin » dans
`server/utils/userStore.ts`, qui ne connaît que `'client' | 'prestataire'`)
— la vérification décrite ici s'effectue aujourd'hui manuellement, par accès
direct aux stores en mémoire ou à une future base de données. La
construction d'une interface support dédiée serait un chantier technique à
part entière, hors périmètre de cette issue.
