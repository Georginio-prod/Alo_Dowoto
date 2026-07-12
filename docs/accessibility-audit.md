# Audit accessibilité (#51)

Ce document consigne l'audit d'accessibilité statique effectué sur le
frontend WorkTogo : ce qui a été vérifié dans le code, ce qui a été corrigé,
et ce qui reste à valider avec un outil réel (axe DevTools / Lighthouse) ou
sur un poste utilisateur, car non exécutable dans l'environnement d'agent
utilisé pour ce lot (pas de navigateur, pas d'affichage graphique).

## 1. Attributs ARIA / libellés — déjà en place, vérifiés

Ces points étaient déjà correctement implémentés au moment de l'audit ; ils
ont été vérifiés composant par composant et laissés inchangés :

- `app/components/OtpInput.vue` : `role="group"` + `aria-label="Code de
  vérification à 6 chiffres"` sur le conteneur, et `aria-label="Chiffre N"`
  sur chacune des 6 cases.
- `app/components/AppHeader.vue` : `role="search"` sur le formulaire,
  `aria-label="Rechercher un service"` sur le champ de recherche.
- `app/pages/auth.vue` : `aria-label="Numéro de téléphone"` et
  `aria-label="Adresse email"` sur les champs de contact.
- `app/pages/paiement.vue` : `aria-label="Numéro Mobile Money"`.
- `app/pages/demande.vue` : `aria-label` sur titre, compétences, description,
  budget, localisation.
- `app/components/ResultsFilters.vue` : le slider de prix (`#filter-price`)
  et le select de ville (`#filter-city`) ont chacun un `<label for="...">`
  associé, ce qui fournit un nom accessible équivalent à un `aria-label`.
- `app/components/ChoiceModal.vue` et `app/components/SectorDrawer.vue` :
  `role="dialog"`, `aria-modal="true"`, `aria-label` dynamique.
- `app/components/ResultsSkeleton.vue` : `role="status"` +
  `aria-label="Chargement des résultats"` sur l'état de chargement.

Aucune modification n'a été nécessaire sur ces points.

## 2. Contraste de couleur — correction appliquée

### Calcul (formule de luminance relative WCAG 2.x)

Couleur auditée : `--color-muted: #6B7280` (texte secondaire / libellés),
utilisée sur fond blanc (`--color-surface: #FFFFFF`) et sur fond
`--color-bg: #F7F7F7`.

Formule appliquée (par canal, `v` normalisé entre 0 et 1) :

```
c = v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ^ 2.4
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
ratio = (L_clair + 0.05) / (L_sombre + 0.05)
```

Résultats **avant correction** (`#6B7280` sur les deux fonds) :

| Fond | Ratio calculé | Seuil AA texte normal (4.5:1) |
| --- | --- | --- |
| `#FFFFFF` (surface) | **4.834:1** | OK, marge confortable |
| `#F7F7F7` (bg) | **4.513:1** | OK de justesse — marge quasi nulle |

Le ratio sur `#F7F7F7` (4.513:1) passe le seuil AA de 4.5:1, mais avec une
marge si faible qu'un léger arrondi de rendu, un anti-aliasing de police
différent, ou une future variante de fond légèrement plus claire ferait
basculer ce texte sous le seuil. Ce n'est pas assez robuste pour un design
system qui réutilise `text-muted` massivement (labels de filtres, notes
secondaires, placeholders, etc.).

### Correction appliquée

`--color-muted` a été assombrie dans `app/assets/css/main.css` (définition
centrale du token, pas de correction au cas par cas dans les composants) :

```
--color-muted: #6B7280  →  #5C626E
```

Résultats **après correction** :

| Fond | Ratio calculé |
| --- | --- |
| `#FFFFFF` (surface) | **6.127:1** |
| `#F7F7F7` (bg) | **5.719:1** |

Les deux ratios dépassent désormais largement le seuil AA (4.5:1) avec une
marge de sécurité confortable, tout en conservant l'intention de design
(gris moyen neutre pour le texte secondaire — la teinte/hue est identique,
seule la luminosité a été réduite d'environ 14 %).

Tous les usages de `text-muted` (classe Tailwind générée depuis le token
`--color-muted`) bénéficient automatiquement de la correction, sans avoir à
toucher chaque composant.

## 3. Fermeture au clavier (Échap) — déjà en place, vérifiée

- `app/components/ChoiceModal.vue` : un listener `keydown` est attaché sur
  `window` à `onMounted` et retiré à `onUnmounted`, avec un handler qui émet
  `cancel` sur `Escape`. Le scroll du `body` est aussi verrouillé/déverrouillé
  correctement.
- `app/components/SectorDrawer.vue` : même pattern, mais piloté par un
  `watch(() => props.sector, ...)` puisque le composant reste monté même
  fermé (`v-if` interne sur le contenu) — le listener `keydown` est
  ajouté/retiré à l'ouverture/fermeture du drawer, avec le même verrouillage
  de scroll.

Les deux composants fermaient déjà correctement au clavier avec `Échap` ;
aucun changement de comportement n'a été nécessaire ici.

## 4. Focus clavier visible — un cas corrigé

Recherche de tous les `outline-none` du frontend et vérification qu'un
remplacement visible existe :

- `OtpInput.vue`, `ResultsFilters.vue` (select ville), `auth.vue`,
  `demande.vue`, `paiement.vue` : tous utilisent `outline-none` **associé à**
  `focus:border-primary` — le changement de couleur de bordure (visible,
  contrastée, sur une bordure de 1.5px) constitue un indicateur de focus
  valide. Aucun changement nécessaire.
- **`app/components/AppHeader.vue` (champ de recherche)** : le champ avait
  `outline-none` sans **aucun** remplacement (`border-none`, pas de
  changement de style au focus) — un utilisateur clavier ne pouvait pas voir
  où se trouvait le focus dans le champ de recherche. **Corrigé** en ajoutant
  `focus-visible:ring-2 focus-visible:ring-primary` (+ `rounded-sm` pour que
  l'anneau ait des coins nets) sur l'input.

Aucun élément cliquable custom (`div`/`span` avec `@click`) n'a été trouvé
sans élément sémantique sous-jacent : toutes les actions cliquables du
frontend (`ChoiceModal`, `SectorGrid`, `SectorDrawer`, `PlanCard`,
`MatchCard`, formulaires `auth`/`demande`/`paiement`) utilisent des
`<button type="button">` ou des `<NuxtLink>`, donc nativement focusables et
activables au clavier (Tab pour atteindre, Entrée/Espace pour activer). Aucun
`tabindex` custom n'a été trouvé dans le code.

## 5. Audit automatisé (axe / Lighthouse) — à faire manuellement

Aucun outil d'audit automatisé (axe-core, Lighthouse) n'a pu être exécuté
dans cet environnement d'agent (pas de navigateur ni de rendu graphique
disponible). Les points ci-dessus ont été vérifiés **statiquement** par
lecture du code et calcul manuel des ratios de contraste.

### Checklist restant à valider par un humain (navigateur réel)

- [ ] Lancer un audit **Lighthouse** (onglet Accessibilité) sur les pages
      `/`, `/auth`, `/demande`, `/abonnement`, `/paiement`, `/resultats`,
      `/matching/[id]`, `/prestataire` et vérifier l'absence d'erreur
      bloquante.
- [ ] Lancer **axe DevTools** (extension navigateur) sur les mêmes pages
      pour détecter d'éventuels problèmes non couverts par une lecture
      statique du code (ex. ordre de focus réel, contraste d'éléments
      générés dynamiquement, ARIA sur des états conditionnels).
- [ ] Valider au clavier, dans un vrai navigateur : `Tab`/`Shift+Tab` sur
      l'ensemble du parcours (recherche → `ChoiceModal` → `auth` → OTP →
      secteur → `abonnement` → `paiement`), `Entrée`/`Espace` pour activer
      les boutons, `Échap` pour fermer `ChoiceModal` et `SectorDrawer`.
- [ ] Vérifier au zoom navigateur 200 % qu'aucun texte n'est tronqué ou
      superposé (hors périmètre de cet audit, lié au responsive — voir
      `docs/responsive-audit.md`).
- [ ] Confirmer visuellement le nouveau `--color-muted` (#5C626E) sur les
      écrans réels (rendu de police, sous-pixel) pour s'assurer qu'il reste
      fidèle à l'intention de design d'origine.
