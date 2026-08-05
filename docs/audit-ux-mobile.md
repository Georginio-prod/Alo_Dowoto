# Audit UX mobile & refonte — incrément 1 (#refonte-ux-mobile)

Audit honnête de l'existant puis première correction ciblée, **non-breaking**.

## Constat : la fondation existe déjà

Contrairement à l'hypothèse d'une app en dette de design, WorkTogo est déjà
mûr sur la plupart des axes d'un design system :

| Axe | État constaté | Preuve |
|-----|---------------|--------|
| Tokens centralisés | ✅ Déjà là | `app/assets/css/main.css` : couleurs sémantiques, 1 police (Poppins), **3 rayons**, **3 ombres** — exactement la cible d'un système propre. |
| Couleurs en dur | ✅ Quasi nul | **4 occurrences hex** dans *tous* les `.vue`. |
| Contraste WCAG | ✅ Audité & durci | `docs/accessibility-audit.md` : `--color-muted` porté à `#5C626E` (ratios 5.7:1 / 6.1:1). |
| Libellés ARIA | ✅ Vérifiés | Idem, composant par composant (OtpInput, AppHeader, dialogs…). |
| Focus clavier | ✅ Unifié | `:focus-visible` global dans `main.css`. |
| Mouvement réduit | ✅ Respecté | `@media (prefers-reduced-motion)` complet. |
| États de chargement | ✅ Skeletons | `.skeleton-shimmer`, `ResultsSkeleton`. |
| i18n (chaînes externalisées) | ✅ Fait | `i18n/locales/fr.json` ≈ **1868 clés**, `en.json`. |

Refaire ces éléments créerait un système en doublon : ce serait une
régression. L'incrément se concentre donc sur un **vrai manque**.

## Le vrai manque : pas de navigation mobile côté chercheur

`AppNavBar.vue` (2ᵉ ligne de menu) est `hidden lg:block` — **desktop
uniquement**, comme le note son propre commentaire. Sur mobile, le parcours
chercheur/public (layout `default.vue`) ne dispose que de l'en-tête compact
(logo + recherche) : **aucune navigation vers les destinations clés**. Pour un
public peu à l'aise avec le numérique, sur téléphone tenu à une main, c'est le
blocage n°1.

## Correction livrée : barre d'onglets mobile (thumb-first)

Nouveau composant `app/components/MobileTabBar.vue` :

- **4 onglets max**, **icône ET libellé** (jamais d'icône seule), role-aware.
  - Chercheur : Accueil · Mes demandes · Messages · Compte
  - Prestataire : Aujourd'hui · Demandes · Revenus · Compte
- Cibles tactiles **≥ 56 px** (> plancher 48 px), libellés **12 px** (plancher respecté).
- `aria-current="page"` sur l'onglet actif, `<nav aria-label>`, icônes `aria-hidden`.
- Fixe en bas d'écran (le pouce), `env(safe-area-inset-bottom)`, **`lg:hidden`**
  (la nav desktop existante prend le relais), masquée pour les visiteurs non
  connectés. Dérive intégralement des tokens (`text-primary`, `bg-surface`,
  `border-hairline`) — zéro valeur en dur.
- Câblée dans `layouts/default.vue` (chercheur/public) **et** `layouts/dashboard-prestataire.vue` (prestataire), qui réservent l'espace bas correspondant.
- **Côté prestataire** : la nav en pastilles du haut (défilement horizontal, texte seul) est masquée sur mobile (`hidden lg:flex`) au profit de la barre basse — plus de double navigation ; elle reste la sidebar verticale sur desktop. L'onglet **Demandes** porte un **badge de notification** (nombre de demandes reçues, `/api/requests/received`), rouge, annoncé aux lecteurs d'écran (`aria-label` « Demandes, N nouvelles ») — « impossible à manquer », c'est son gagne-pain.

Purement additive/non-breaking : le desktop est inchangé dans les deux layouts.

## Avant / après — taps depuis l'écran d'accueil (mobile, chercheur connecté)

| Destination | Avant | Après |
|-------------|-------|-------|
| Mes demandes | non atteignable directement (en-tête sans lien) | **1 tap** |
| Messages | ≥ 2 (via menu compte) | **1 tap** |
| Compte | ≥ 2 (via menu compte) | **1 tap** |
| Accueil | variable | **1 tap** |

## Vérification

- `nuxt typecheck` : ✅ 0 erreur.
- JSON i18n (fr + en) : ✅ valides.
- À valider sur appareil réel : rendu sur écran 5", police système agrandie,
  et passe Lighthouse — cohérent avec la checklist « à valider en navigateur
  réel » de `docs/accessibility-audit.md`.

## Reste à faire (incréments suivants)

- Badge « Demandes » **temps réel** : le compteur actuel se charge à
  l'affichage (`lazy`) ; le rafraîchissement live (polling/websocket) reste à
  ajouter.
- Refonte écran par écran (paiement-réassurance, suivi de mission en frise,
  onboarding 3 écrans) — étapes 3 à 6 du brief.
