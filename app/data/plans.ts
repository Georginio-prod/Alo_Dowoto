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
  demandesIllimitees: boolean,
  badgeVerifie: boolean,
  miseEnAvant: boolean,
  supportPrioritaire: boolean,
): PlanFeature[] {
  return [
    { label: 'Profil visible dans les résultats', included: profilVisible },
    { label: 'Réception illimitée de demandes', included: demandesIllimitees },
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
