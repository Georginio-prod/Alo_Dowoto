# ADR 0010 — Obligations fiscales de déclaration des revenus prestataires

**Statut :** Analyse préliminaire documentée ; **avis fiscal écrit externe requis avant toute mise en œuvre**
**Contexte :** issue #287 (« Clarifier les obligations fiscales de déclaration des revenus prestataires »)

## Pourquoi cette issue ne peut pas être « résolue » par du code ou une décision interne

WorkTogo est un intermédiaire de paiement (séquestre, `server/utils/escrowOrderStore.ts`)
entre des chercheurs et des prestataires indépendants. Selon le droit
togolais et la réglementation UEMOA applicable aux plateformes numériques
d'intermédiation, une telle plateforme peut être soumise à des obligations
déclaratives vis-à-vis de l'administration fiscale (ex. déclaration
annuelle des revenus versés à des tiers, retenue à la source le cas
échéant, TVA sur la commission perçue). Ces règles dépendent de critères
précis (statut juridique de WorkTogo, volumes traités, qualification des
prestataires — salariés/indépendants/entreprises) qui ne peuvent pas être
tranchés par une analyse de code : **seul un conseil fiscal togolais peut
produire l'avis écrit exigé par le premier critère d'acceptation de cette
issue.** Aucune personne ni aucun outil de ce dépôt n'est habilité à rendre
cet avis à sa place — le prétendre serait donner une fausse assurance de
conformité sur un sujet à risque réputationnel et réglementaire réel.

## Ce que ce document fournit à la place

Une synthèse des questions concrètes à soumettre au conseil fiscal, fondée
sur l'état réel du produit (montants, mécanismes, flux financiers déjà en
place), pour que la consultation soit rapide et actionnable plutôt que de
partir d'une feuille blanche.

### 1. Flux financiers actuels à qualifier

- **Abonnements prestataires** (`app/data/plans.ts`) : 5 000 à 48 000 FCFA
  selon la formule, payés par Mobile Money — revenu direct de WorkTogo.
- **Commission de mise en relation** (`ESCROW_COMMISSION_RATE = 0.1`,
  `server/utils/escrowOrderStore.ts`) : 10 % prélevés sur chaque prestation
  réglée en séquestre, au moment de la libération des fonds vers le
  prestataire — également un revenu direct de WorkTogo.
- **Montant net reversé au prestataire** : 90 % du prix convenu, crédité sur
  son solde WorkTogo (`server/utils/walletStore.ts`), retirable vers Mobile
  Money (`server/api/wallet/withdraw.post.ts`).

### 2. Questions concrètes à poser au conseil fiscal

1. WorkTogo a-t-elle une obligation de retenue à la source sur les sommes
   reversées aux prestataires indépendants, ou la responsabilité déclarative
   incombe-t-elle entièrement au prestataire au titre de son activité
   indépendante ?
2. La commission de 10 % perçue par WorkTogo est-elle soumise à la TVA
   togolaise ? Si oui, à quel taux, et doit-elle apparaître distinctement
   dans un document transmis au prestataire ?
3. WorkTogo a-t-elle une obligation de transmettre un relevé annuel
   récapitulatif des sommes versées à chaque prestataire (montant brut,
   commission prélevée, montant net) — à l'administration fiscale, au
   prestataire, ou aux deux ?
4. Ces obligations diffèrent-elles selon que le prestataire est enregistré
   comme entreprise individuelle, ou n'a aucun statut formel déclaré ?
5. Y a-t-il un seuil de volume annuel (par prestataire, ou global pour
   WorkTogo) au-delà duquel des obligations supplémentaires s'appliquent ?

### 3. Plan d'action (une fois l'avis écrit obtenu)

1. Qualifier chaque obligation confirmée par le conseil fiscal (retenue à
   la source, TVA, relevé annuel) et son échéance légale.
2. Pour un relevé annuel prestataire, si confirmé nécessaire : les données
   requises existent déjà dans les stores actuels (`walletStore.ts`
   conserve l'historique complet des mouvements par utilisateur,
   `escrowOrderStore.ts` la commission prélevée par commande) — un export
   récapitulatif par prestataire serait une extension du mécanisme d'export
   de compte déjà livré pour #286 (`GET /api/account/export`), pas un
   chantier from scratch.
3. Documenter dans les CGU/mentions légales (`app/data/legalPages/`) toute
   obligation qui rejaillit sur le prestataire (ex. rappel qu'il reste seul
   responsable de la déclaration de ses revenus au titre de son activité
   indépendante), une fois confirmée par le conseil fiscal — pas avant, pour
   ne pas afficher une information juridique non vérifiée.
4. Budgéter la consultation fiscale elle-même comme prérequis produit,
   distinct du travail d'ingénierie.

## Critères d'acceptation de l'issue — état

- [ ] Avis fiscal écrit obtenu — **non réalisable depuis ce dépôt**, nécessite
      l'engagement d'un conseil fiscal togolais externe.
- [x] Plan d'action associé documenté — voir section 3 ci-dessus, prêt à
      être exécuté dès réception de l'avis.
