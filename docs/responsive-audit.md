# Audit responsive & mobile (#50)

Ce document consigne l'audit responsive effectué **statiquement** (lecture du
markup/CSS, calcul des largeurs de conteneurs et des grilles) sur le
frontend WorkTogo, avec pour priorité l'absence de régression de mise en
page en dessous de **375px** de large (repère iPhone SE / petits Android).

Aucun navigateur ni device réel n'était disponible dans cet environnement
d'agent : cet audit ne remplace pas un test sur un vrai téléphone (voir
checklist en bas de document).

## Fichiers audités

`app/pages/resultats.vue`, `app/pages/auth.vue`, `app/pages/paiement.vue`,
`app/components/SectorDrawer.vue`, `app/components/SectorGrid.vue`,
`app/components/ResultsFilters.vue`, `app/components/ResultsSkeleton.vue`,
`app/pages/matching/[id].vue`, `app/components/MatchCard.vue`,
`app/components/ProviderCard.vue`.

Après un rebase sur `develop` (qui avait entre-temps reçu la page « Toutes
les catégories », #66), le périmètre a été étendu à `app/pages/categories/index.vue`
et `app/pages/categories/[slug].vue` : ces deux pages neuves réutilisent
exactement les mêmes motifs de grille (`auto-fill`/`minmax`, `ResultsSkeleton`)
déjà couverts par cet audit — elles ont donc reçu le même traitement pour
rester cohérentes.

## Méthode

Pour chaque grille/conteneur à largeur contrainte, la largeur de contenu
disponible à 375px de viewport a été recalculée à la main : largeur du
conteneur parent (`max-w-*`/`w-full`) moins le padding horizontal cumulé
(`px-*`), puis comparée aux `minmax(...)` / largeurs fixes utilisées par les
enfants, pour détecter tout débordement horizontal ou toute marge de
sécurité trop faible (proche de 0, donc fragile au moindre changement de
padding, à un scrollbar de plateforme, ou à un arrondi de sous-pixel).

## Corrections appliquées

### 1. `app/components/SectorGrid.vue` (ligne 12) — marge de sécurité quasi nulle, corrigée

Grille des secteurs : conteneur `section.px-6` (24px de chaque côté). À
375px de large, largeur de contenu disponible = 375 − 48 = **327px**.

Avant : `grid-cols-[repeat(auto-fill,minmax(160px,1fr))]` avec `gap-3.5`
(14px). Pour que 2 colonnes de 160px tiennent, il faut 160×2 + 14 =
**334px** — soit **7px de plus** que les 327px disponibles. Le calcul
CSS `auto-fill` bascule donc bien à 1 colonne à 375px pile, mais avec une
marge de sécurité de seulement 7px : un changement mineur de padding, une
barre de défilement de plateforme, ou un écart d'arrondi sous-pixel
suffirait à faire tenter 2 colonnes et déborder.

**Corrigé** en `grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]` :
2 colonnes fixes (fractions `1fr` égales, sans contrainte de largeur
minimale) en dessous du breakpoint `sm` (640px) — la largeur de chaque
colonne s'adapte toujours à l'espace réellement disponible, donc **aucun
débordement possible quelle que soit la largeur exacte du viewport**. Le
motif `auto-fill`/`minmax(160px,1fr)` d'origine reste utilisé à partir de
`sm`, une fois qu'il y a une marge confortable.

### 2. `app/pages/categories/index.vue` (ligne 30) et `app/pages/categories/[slug].vue` (ligne 88) — cohérence avec le motif ci-dessus

Ces deux pages (page « Toutes les catégories », arrivée entre-temps sur
`develop` via #66) réutilisent le même motif `auto-fill`/`minmax` :

- `categories/index.vue` : grille des secteurs en `minmax(220px,1fr)` avec
  `px-6` — marge confortable à 375px (≈129px), non fragile, mais harmonisée
  en `grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]` par
  cohérence avec `SectorGrid.vue`.
- `categories/[slug].vue` : grille de résultats en `minmax(250px,1fr)`,
  identique à celle de `resultats.vue`, et qui réutilise le même composant
  `ResultsSkeleton.vue` pour son état de chargement. Comme `ResultsSkeleton`
  a été harmonisé en `grid-cols-1 sm:grid-cols-[...]` (voir point 2), la
  grille de résultats chargés devait recevoir le même point de rupture pour
  éviter un saut de mise en page entre l'état `pending` et l'état chargé.
  Corrigée en `grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]`.

### 3. `app/pages/resultats.vue` (ligne 116) et `app/components/ResultsSkeleton.vue` (ligne 2) — durcissement défensif (résultats)

Grille des résultats : conteneur `flex-col` (mobile) avec `px-5` (20px de
chaque côté) → largeur de contenu à 375px = 375 − 40 = **335px**. Avec
`minmax(250px,1fr)` et `gap-4` (16px), il faudrait 250×2 + 16 = 516px pour 2
colonnes — très supérieur aux 335px disponibles, donc **pas de risque de
débordement réel** ici (marge large, ~180px). Le changement apporté est une
mesure défensive plutôt qu'un correctif d'un bug observé :

- Passage explicite en `grid-cols-1` en dessous de `sm`, et
  `sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]` au-delà — pour ne
  plus dépendre du calcul implicite `auto-fill` à faible largeur (robuste
  si le padding de la page change plus tard) et pour que la grille de l'état
  de chargement (`ResultsSkeleton.vue`) utilise exactement le même point de
  rupture que la grille des résultats réels, évitant tout saut de mise en
  page (layout shift) entre l'état `pending` et l'état chargé.

### 4. Éléments vérifiés — aucune régression trouvée, aucun changement nécessaire

- **`app/components/SectorDrawer.vue`** — bottom-sheet mobile : conteneur
  externe `fixed inset-0 flex items-end justify-center` (ancré en bas,
  correct pour un bottom-sheet), panneau `w-full max-w-[560px] max-h-[78vh]
  overflow-auto` (largeur pleine sur mobile, hauteur plafonnée à 78% du
  viewport avec défilement interne propre — pas de débordement horizontal
  possible, `w-full` s'adapte à n'importe quelle largeur). Les boutons de
  sous-secteurs n'ont pas de `min-w-0`/`truncate` explicite, mais le texte
  est dans un `<span>` en flux normal (`white-space: normal` par défaut) :
  un nom de sous-secteur long (ex. « Réparation ordinateurs/téléphones »)
  passe à la ligne au lieu de déborder — vérifié pour tous les noms de
  `app/data/sectors.ts`, aucun ne pose de problème à 335px de large de
  contenu (panneau 375px − padding `p-5` de 20px de chaque côté).
- **`app/pages/resultats.vue`** — sidebar de filtres (`aside.w-full
  lg:w-[240px]`) : en dessous de `lg` (1024px), le conteneur parent passe de
  `lg:flex-row` à `flex-col` (comportement par défaut), donc la sidebar
  s'empile bien au-dessus de la liste de résultats en pile verticale pleine
  largeur. Confirmé qu'il n'y a pas de régression : à 375px, `aside` et
  `section` prennent chacun 335px de large (conteneur `max-w-[1200px]
  px-5`), aucun débordement.
- **`app/pages/auth.vue`** et **`app/pages/paiement.vue`** — formulaires déjà
  mobile-first : conteneurs `w-full max-w-[440px]` (aucune largeur fixe qui
  dépasserait 375px), champ téléphone avec préfixe `+228` en `w-16
  shrink-0` à côté d'un input `min-w-0 flex-1` (empêche l'input de forcer un
  débordement horizontal — c'était déjà correctement en place). Boutons de
  sélection (onglets, rôle, méthode de contact, moyen de paiement) en
  `flex`/`grid-cols-2` avec largeurs relatives, aucune valeur fixe
  problématique trouvée.
- **`app/components/ResultsFilters.vue`** — slider de prix en `w-full`,
  select ville en `w-full`, boutons de note en pile verticale
  (`flex flex-col`) : aucune largeur fixe, s'adapte à la largeur de la
  sidebar quel que soit le breakpoint.
- **`app/components/MatchCard.vue`** — déjà mobile-first exemplaire :
  `flex-col` puis `sm:flex-row`, colonne photo `sm:w-[150px]` (pleine
  largeur en dessous de `sm`), grille de scores `grid-cols-1
  sm:grid-cols-2`. Aucun changement nécessaire.
- **`app/components/ProviderCard.vue`** et **`app/pages/matching/[id].vue`**
  — pas de largeur fixe problématique, conteneurs `max-w-[900px] px-5` avec
  contenu qui s'empile en `flex-col` sur mobile.

## Breakpoints vérifiés

- **375px (priorité, iPhone SE / petits Android)** : chaque grille et
  conteneur listé ci-dessus a été recalculé à la main pour cette largeur —
  voir détail des corrections ci-dessus.
- **320px** (mentionné pour référence, hors exigence de l'issue qui ne
  couvre que « en dessous de 375px ») : avec les corrections `grid-cols-2`
  fixes (SectorGrid) et `grid-cols-1` fixe (résultats), le calcul ne dépend
  plus de `minmax(...)`, donc le comportement reste sûr même en dessous de
  375px, bien que non explicitement requis par l'issue.
- **640px (`sm`) / 1024px (`lg`)** : points de rupture existants revérifiés
  pour confirmer qu'ils ne changent pas de comportement suite aux
  corrections (le motif `auto-fill`/`minmax` d'origine est conservé
  au-delà de `sm`, où la marge de sécurité est confortable).

## Checklist — reste à valider par un humain

Ces points ne peuvent pas être simulés dans cet environnement d'agent (pas
de navigateur, pas de device physique) :

- [ ] **Test sur au moins un vrai device mobile physique** (pas seulement
      les devtools navigateur) — critère d'acceptation explicite de
      l'issue #50, à réaliser par l'équipe.
- [ ] Vérification visuelle à 375px sur un vrai navigateur (Chrome DevTools
      device toolbar a minima, en complément du test device réel) sur les
      pages : `/`, `/auth`, `/demande`, `/abonnement`, `/paiement`,
      `/resultats`, `/matching/[id]`, `/prestataire`.
      Cette étape n'a pas non plus pu être exécutée ici (pas de rendu
      graphique disponible), mais elle est moins critique que le test sur
      device réel car les calculs de cet audit sont vérifiables
      indépendamment.
- [ ] Test tactile réel du drawer `SectorDrawer` (glissement, défilement
      interne, fermeture) et du slider de prix (`ResultsFilters`) sur écran
      tactile — le comportement au clavier/souris a été vérifié
      statiquement, pas le comportement tactile.
- [ ] Vérifier le rendu des polices (Poppins via Google Fonts) sur device
      réel : les calculs de largeur de texte de cet audit sont des
      estimations basées sur des largeurs de caractères moyennes, pas une
      mesure exacte de rendu.
