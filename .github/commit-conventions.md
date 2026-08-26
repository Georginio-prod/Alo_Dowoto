# Conventions de commit

> Aligné sur le modèle cnc-portal. Ces conventions s'appliquent aussi aux
> **titres d'issues et de PR**.

## Format

```text
<type><gitmoji>: <sujet>

[corps optionnel]
[pied optionnel]
```

- **Pas de scope.** Écrire `feat: …`, pas `feat(api): …`.
- **Le gitmoji est obligatoire**, apparié au type.
- **Impératif, présent** dans le sujet (« ajoute », pas « ajouté »).
- **Sujet ≤ 72 caractères, sans point final.**

## Correspondance type → gitmoji

| Type       | Gitmoji | Usage                                  |
| ---------- | ------- | -------------------------------------- |
| `feat`     | ✨      | Nouvelle fonctionnalité                |
| `fix`      | 🐛      | Correction de bug                      |
| `refactor` | ♻️      | Changement de code sans changement de comportement |
| `docs`     | 📝      | Documentation uniquement               |
| `test`     | ✅      | Ajout/mise à jour de tests             |
| `chore`    | 🔧      | Outillage, dépendances, ménage         |
| `style`    | 💄      | Formatage / style UI uniquement        |
| `perf`     | ⚡️      | Amélioration de performance            |
| `build`    | 📦      | Système de build ou dépendances externes |
| `ci`       | 👷      | Configuration CI                       |

## Exemples

Bon :

```text
feat: ✨ ajoute la sélection de secteur
fix: 🐛 gère le propriétaire d'équipe nul
refactor: ♻️ extrait la logique de validation partagée
docs: 📝 met à jour la section variables d'environnement du README
chore: 🔧 monte prettier en 3.6.2
```

Mauvais :

```text
fix: bug
feat: ajouté des trucs
update: changements
feat(api): ✨ ajoute un endpoint   ← pas de scope
```

## Commits atomiques

Un commit par changement logique. **Ne pas** regrouper des changements sans
rapport, et **ne pas** écraser toute une PR en un seul commit à la fin. On
commit au fur et à mesure pour que l'historique reste relisible.
