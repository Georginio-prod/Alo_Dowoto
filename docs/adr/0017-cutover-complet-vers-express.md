# ADR 0017 — Cutover complet vers Express (abandon de l'API Nitro)

**Statut :** Accepté (2026-08-27) — **remplace la stratégie de migration progressive**
de [ADR-0016](0016-iso-fonctionnement-par-tests-de-contrat.md) (« zéro changement,
bascule domaine par domaine sans interruption »).

**Contexte :** décision du fondateur — **ne plus utiliser Nitro pour l'API**. Tout
doit passer par le backend Express, avec une structure propre, quitte à **couper
le site un moment** au cutover.

## Décision

1. **Fin de l'API Nitro.** Les 183 routes `server/api/**` sont portées vers le
   backend Express, puis `server/api/**` et `server/utils/**` sont **supprimés**.
2. **Front en SPA.** L'app Nuxt passe en **mode SPA** (`ssr: false`, build
   statique) — plus de serveur Nitro au runtime. On **garde Nuxt** (pas de
   réécriture Vite) : mêmes bénéfices qu'une SPA Vite (comme cnc-portal), sans
   jeter le front existant.
3. **Reverse proxy `/api/* → backend`.** En dev (proxy Nuxt/Vite) et en prod
   (nginx/Caddy/rewrites). Le web reste **same-origin** → cookies OK, **aucun
   problème cross-origin**, et les ~73 appels `/api` du front **ne changent pas**.
   Le mobile et le dashboard tapent le backend en direct (Bearer).
4. **Le backend possède la couche données.** Prisma (schéma + migrations + config
   + client) vit dans `backend/prisma/` ; le client est mutualisé via les
   workspaces npm (l'app l'importe tant que Nitro n'est pas retiré).
5. **Downtime accepté** au cutover prod uniquement — le développement se fait sur
   branches sans couper le site.

## Ce qui est conservé de l'ADR-0016

Le **harnais de tests de contrat** (`tests/contract/`) reste central : chaque
domaine porté vers Express est validé **iso** (rejeu identique à l'ancien Nitro).
Le « zéro changement » n'est plus une contrainte de déploiement (downtime permis),
mais reste un **objectif de correction** vérifié par les tests.

## Conséquences

- Le point de bascule `useApi` / `NUXT_PUBLIC_MIGRATED_API_PREFIXES` devient
  **inutile** (le proxy suffit) → retiré en Phase 3.
- Déploiement : deux artefacts (front statique + backend Express) derrière un
  proxy.
- Effort important (portage massif) mais **plus rapide** sans bascule graduelle.
- Le plan d'exécution : Phase 0 (Prisma → backend, **faite**) → 1 (couche
  transverse) → 2 (portage par domaine + rejeu de contrat) → 3 (SPA + proxy +
  suppression Nitro) → 4 (déploiement + cutover prod).
