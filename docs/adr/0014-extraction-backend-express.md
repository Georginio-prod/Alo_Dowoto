# ADR 0014 — Extraction du backend Nitro vers un service Express autonome

**Statut :** Accepté (2026-08-27) — remplace le choix « Nitro server routes » de
[`docs/architecture-api.md`](../architecture-api.md).
**Contexte :** chantier d'extraction backend. L'API (`server/api/**`, Nitro) est
déjà consommée par **plusieurs clients** : le site web (SSR Nuxt), le dashboard
admin desktop (Electron, auth `Bearer`) et l'app mobile.

## Constat

`docs/architecture-api.md` justifiait de garder l'API intégrée à Nuxt (Nitro) :
un seul déploiement, types partagés, équipe réduite, **un seul frontend
consommateur**. Cette dernière prémisse n'est plus vraie — l'API sert désormais
trois clients hétérogènes, dont deux hors du process Nuxt. Un vrai service HTTP
autonome, versionnable et déployable indépendamment, est désormais justifié.

## Décision

Extraire l'API vers un service **Express + TypeScript autonome** dans un dossier
`backend/`, frère de `app/` dans le **même dépôt** (`app/` + `backend/`).
Structure en couches :
`config/ routes/ controllers/ services/ repositories/ validation/schemas/ middleware/ utils/ types/`.

- Le dépôt reste unique (pas de monorepo multi-packages) : `app/` (front Nuxt),
  `backend/` (API Express).
- La migration est **incrémentale (strangler-fig)** : voir [ADR-0016](0016-iso-fonctionnement-par-tests-de-contrat.md).

## Conséquences

- Deux cibles de build/déploiement (front + backend), CORS entre elles.
- Perte du partage de types natif Nitro → compensé par le point de bascule
  côté front (`app/composables/useApi.ts`) et, à terme, un client typé généré.
- Le partage de la logique métier et des données est traité par
  [ADR-0015](0015-partage-logique-metier-et-donnees.md).
- Aucun changement de comportement pour les clients existants n'est toléré
  ([ADR-0016](0016-iso-fonctionnement-par-tests-de-contrat.md)).
