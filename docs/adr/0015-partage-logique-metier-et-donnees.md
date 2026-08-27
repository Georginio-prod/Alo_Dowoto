# ADR 0015 — Partage de la logique métier et de l'accès aux données

**Statut :** Accepté (2026-08-27)
**Contexte :** [ADR-0014](0014-extraction-backend-express.md). Pendant la
migration, la logique métier doit servir **à la fois** les routes Nitro
restantes et le nouveau backend Express, sur **la même base de données**.

## Constat

La logique de `server/utils/**` (les `*Store.ts` et services) est **couplée à
Nitro** : elle s'appuie sur les auto-imports (`prisma`, `createError`,
helpers h3), l'alias `~~` et le runtime h3. Le backend Express (projet séparé,
CommonJS) ne peut donc pas l'importer telle quelle. De plus, la base actuelle
est **SQLite en fichier** (`file:./dev.db`) — adaptée au dev mono-process, pas à
un backend concurrent multi-clients.

## Décision

1. **Découplage progressif de la logique métier.** Au fil du portage de chaque
   domaine, la logique est rendue **agnostique du framework** : imports
   explicites (pas d'auto-import Nitro), aucune dépendance à h3/`createError`
   (on lève des erreurs neutres, cf. `backend/src/utils/apiError.ts`), client
   Prisma injecté. Elle devient importable par Express comme par Nitro.
2. **Un seul schéma Prisma** (racine, `prisma/schema.prisma`) reste la source de
   vérité. Le backend génère son propre client à partir de ce schéma partagé
   (pas de duplication de schéma).
3. **Base cible : PostgreSQL dans un conteneur Docker.** On remplace SQLite par
   **Postgres** (via `docker compose`), **même base pour l'app et le backend**
   pendant la migration. Postgres gère les écritures concurrentes des trois
   clients, contrairement à SQLite. `DATABASE_URL` pilote la connexion (env).
   Le changement de moteur est **transparent pour le comportement de l'API** —
   garanti par les tests de contrat ([ADR-0016](0016-iso-fonctionnement-par-tests-de-contrat.md)).

## Conséquences

- Ajout d'un `docker-compose` avec un service **Postgres** (créé au câblage
  Prisma du backend). Mailpit/adminer optionnels comme dans les projets frères.
- Migration des données/schéma SQLite → Postgres (provider Prisma, migrations).
- Le découplage se fait **domaine par domaine**, jamais en un bloc : tant qu'un
  `*Store` n'est pas porté, sa route Nitro continue de l'utiliser.
- Risque principal : divergence de comportement au changement de moteur → couvert
  par le rejeu des tests de contrat avant chaque bascule.
