# Guide de contribution

## Workflow

1. Partir de `develop` (branche principale). **Ne jamais réécrire l'historique
   de `develop`** (rebase/force-push interdits — l'historique a déjà été
   endommagé une fois).
2. Créer une branche par unité de travail :
   - `feat/<issue>-<slug>` · `fix/<issue>-<slug>` · `chore/<slug>` · `docs/<slug>`
   - Pour le chantier de restructuration : `section/app` et `section/backend`.
3. Faire les changements, avec des **commits atomiques** suivant les
   [conventions de commit](.github/commit-conventions.md) (Conventional Commits + gitmoji).
4. Ouvrir une PR vers `develop` depuis le template, lier l'issue avec `Fixes #N`.
5. Attendre la revue et le vert de la CI, puis merger.

## Règles CI/CD

- **Taille de PR** plafonnée par Danger (400 lignes de production / 800 de test,
  fichiers générés exclus). Dérogation via le label `large-pr-justified` + une
  note `## Large PR justification`.
- **Husky** : `pre-commit` lance `lint-staged` (ESLint + markdownlint sur les
  fichiers indexés) ; `pre-push` lance `npm run lint:md` (lint de la doc — le
  lint du code est assuré par la CI et le `pre-commit`).
- **Un workflow par section** : `ci.yml` (frontend Nuxt) et `backend-ci.yml`
  (backend Express, **path-filtré sur `backend/**`**). Chacun lance ses propres
  lint / typecheck / test / build. Voir [`docs/deployment.md`](docs/deployment.md).

## Commandes de validation

Racine (tant que le dépôt n'est pas découpé) :

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Markdown / documentation :

```bash
npm run lint:md
```

Backend Express (sous-projet `backend/`, nécessite le conteneur Postgres pour
les tests — `docker compose up -d postgres`) :

```bash
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run build
```
