export type PlanSlug = 'mensuel' | 'trimestriel' | 'annuel'

export interface PlanFeature {
  label: string
  included: boolean
}

export interface Plan {
  slug: PlanSlug
  name: string
  price: number
  priceLabel: string
  period: string
  note: string
  tag?: string
  durationDays: number
  features: PlanFeature[]
}

function features(
  profilVisible: boolean,
  receptionDemandes: boolean,
  badgeVerifie: boolean,
  miseEnAvant: boolean,
  supportPrioritaire: boolean,
): PlanFeature[] {
  return [
    { label: 'Profil visible dans les résultats', included: profilVisible },
    // Le nombre exact de demandes reçues par mois diffère par formule (voir
    // PROVIDER_REQUESTS_MONTHLY_LIMIT, server/utils/quotaStore.ts) — cette
    // ligne dit seulement "vous en recevez", le détail chiffré est dans
    // PLAN_COMPARISON ci-dessous plutôt que de promettre "illimité" à tort.
    { label: 'Réception de demandes clients', included: receptionDemandes },
    { label: 'Badge "Vérifié" inclus', included: badgeVerifie },
    { label: 'Mise en avant en tête des résultats', included: miseEnAvant },
    { label: 'Support prioritaire par chat', included: supportPrioritaire },
  ]
}

export const PLANS: [Plan, Plan, Plan] = [
  {
    slug: 'mensuel',
    name: 'Mensuel',
    price: 5000,
    priceLabel: '5 000 FCFA',
    period: '/mois',
    note: 'Facturé chaque mois',
    durationDays: 30,
    features: features(true, true, false, false, false),
  },
  {
    slug: 'trimestriel',
    name: 'Trimestriel',
    price: 13500,
    priceLabel: '13 500 FCFA',
    period: '/3 mois',
    note: 'Soit 4 500 FCFA/mois',
    tag: 'Le plus populaire',
    durationDays: 90,
    features: features(true, true, true, false, true),
  },
  {
    slug: 'annuel',
    name: 'Annuel',
    price: 48000,
    priceLabel: '48 000 FCFA',
    period: '/an',
    note: 'Soit 4 000 FCFA/mois',
    tag: 'Meilleure offre',
    durationDays: 365,
    features: features(true, true, true, true, true),
  },
]

export function findPlan(slug: string): Plan | undefined {
  return PLANS.find((plan) => plan.slug === slug)
}

/** Valeur d'une ligne du tableau comparatif : coche/croix, ou un texte quand la formule varie plus finement qu'un simple oui/non. */
export type PlanComparisonValue = boolean | string

export interface PlanComparisonRow {
  label: string
  values: Record<PlanSlug, PlanComparisonValue>
}

export interface PlanComparisonCategory {
  title: string
  rows: PlanComparisonRow[]
}

/**
 * Détail du tableau comparatif de /abonnement, sous les cartes de prix.
 * Reprend les fonctionnalités réellement livrées (recherche, messagerie,
 * avis, paiement Mobile Money…) — les quotas de demandes reçues par mois
 * reflètent exactement PROVIDER_REQUESTS_MONTHLY_LIMIT
 * (server/utils/quotaStore.ts) plutôt qu'une promesse marketing
 * déconnectée de ce qui est effectivement appliqué.
 */
export const PLAN_COMPARISON: PlanComparisonCategory[] = [
  {
    title: 'Visibilité',
    rows: [
      { label: 'Profil visible dans les résultats de recherche', values: { mensuel: true, trimestriel: true, annuel: true } },
      { label: 'Badge « Vérifié » sur le profil', values: { mensuel: false, trimestriel: true, annuel: true } },
      { label: 'Mise en avant en tête des résultats', values: { mensuel: false, trimestriel: false, annuel: true } },
    ],
  },
  {
    title: 'Demandes clients',
    rows: [
      { label: 'Demandes reçues par mois', values: { mensuel: '5 / mois', trimestriel: '20 / mois', annuel: 'Illimité' } },
      { label: 'Messagerie intégrée avec les clients', values: { mensuel: true, trimestriel: true, annuel: true } },
      { label: 'Formulaire de première prise de contact', values: { mensuel: true, trimestriel: true, annuel: true } },
    ],
  },
  {
    title: 'Réputation',
    rows: [
      { label: "Réception d'avis et notes clients", values: { mensuel: true, trimestriel: true, annuel: true } },
      { label: 'Note moyenne affichée sur le profil', values: { mensuel: true, trimestriel: true, annuel: true } },
    ],
  },
  {
    title: 'Paiement & assistance',
    rows: [
      { label: 'Paiement par Mobile Money (Flooz, T-Money)', values: { mensuel: true, trimestriel: true, annuel: true } },
      { label: 'Support par chat', values: { mensuel: 'Standard', trimestriel: 'Prioritaire', annuel: 'Prioritaire' } },
      { label: 'Essai gratuit à la première souscription', values: { mensuel: '14 jours', trimestriel: '14 jours', annuel: '14 jours' } },
    ],
  },
]
