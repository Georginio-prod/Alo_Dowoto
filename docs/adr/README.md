# Architecture Decision Records — WorkTogo (Alo Dowoto)

Ce dossier consigne les **décisions d'architecture et de produit** du projet.
Chaque ADR capture _une_ décision : son contexte, l'option retenue, et ses
conséquences — pour qu'un nouveau contributeur comprenne **pourquoi** le système
est fait ainsi, sans reconstituer l'historique depuis le code.

> Anciennement `docs/decisions/` — renommé en `docs/adr/` lors du chantier
> d'extraction backend, pour un chemin standard et cohérent avec le code.

## Index

| #    | Titre                                                                                  | Statut   |
| ---- | -------------------------------------------------------------------------------------- | -------- |
| [0001](0001-paiement-integral-plateforme.md)              | Paiement intégral via la plateforme                          | Accepté |
| [0002](0002-partenaire-paiement-escrow.md)                | Partenaire de paiement agréé pour le séquestre               | Accepté |
| [0003](0003-strategie-lancement-freemium.md)              | Stratégie de lancement freemium                              | Accepté |
| [0004](0004-autonomie-prestataire-cgu.md)                 | Autonomie réelle du prestataire (revue CGU)                  | Accepté |
| [0005](0005-lancement-geographique-cible.md)              | Lancement géographique ciblé                                 | Accepté |
| [0006](0006-assurance-responsabilite-civile.md)           | Assurance responsabilité civile pendant les interventions    | Accepté |
| [0007](0007-procedure-signalement-contournement.md)       | Procédure de traitement d'un signalement de contournement    | Accepté |
| [0008](0008-audit-securite-donnees-sensibles.md)          | Audit de sécurité du stockage des données sensibles          | Accepté |
| [0009](0009-instrumentation-erreurs-production.md)        | Instrumentation d'erreurs en production                      | Accepté |
| [0010](0010-obligations-fiscales-prestataires.md)         | Obligations fiscales de déclaration des revenus prestataires | Accepté |
| [0011](0011-etude-modele-hybride-abonnement-commission.md) | Abonnement seul vs modèle hybride abonnement + commission   | Accepté |
| [0012](0012-harnais-tests-integration-http.md)            | Harnais de test d'intégration HTTP                           | Accepté |
| [0013](0013-migration-persistance-stores-escrow.md)       | Migration des stores métier en mémoire vers Prisma           | Accepté |
| [0014](0014-extraction-backend-express.md)                | Extraction du backend Nitro vers un service Express autonome | Accepté |
| [0015](0015-partage-logique-metier-et-donnees.md)         | Partage de la logique métier et de l'accès aux données       | Accepté |
| [0016](0016-iso-fonctionnement-par-tests-de-contrat.md)   | Iso-fonctionnement garanti par des tests de contrat          | Accepté |

## Le chantier d'extraction backend

Les ADR **0014 → 0016** forment un lot cohérent qui cadre l'extraction du backend
Nitro vers un service Express autonome (`backend/`), sur une base **PostgreSQL en
conteneur Docker**, avec **zéro changement fonctionnel** garanti par le harnais
`tests/contract/`. Lire dans l'ordre : 0014 (pourquoi/forme) → 0015 (partage
logique + données) → 0016 (garantie d'iso-fonctionnement).

## Convention

- Fichier : `NNNN-titre-en-kebab-case.md` (numéro incrémental, jamais réutilisé).
- En-tête : `# ADR NNNN — Titre`, puis `**Statut :**` et `**Contexte :**`.
- Statuts : `Proposé` → `Accepté` → (`Déprécié` / `Remplacé par #NNNN`).
- On ne réécrit pas une décision actée : on en crée une nouvelle qui la remplace
  et on met à jour le statut de l'ancienne.
