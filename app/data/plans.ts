export type PlanSlug = 'mensuel' | 'trimestriel' | 'annuel'

/** Clé de traduction sous `plans.features.*` (i18n/locales/{fr,en}.json) — jamais un libellé littéral, voir #i18n. */
export interface PlanFeature {
  labelKey: string
  included: boolean
}

export interface Plan {
  slug: PlanSlug
  price: number
  priceLabel: string
  /** `true` si cette formule porte un badge (« Le plus populaire »/« Meilleure offre ») — le texte du badge est traduit via `plans.<slug>.tag`. */
  hasTag: boolean
  durationDays: number
  features: PlanFeature[]
}

function features(
  profilVisible: boolean,
  receptionDemandes: boolean,
  miseEnAvant: boolean,
  supportPrioritaire: boolean,
): PlanFeature[] {
  return [
    { labelKey: 'profileVisible', included: profilVisible },
    // Le nombre exact de demandes reçues par mois diffère par formule (voir
    // PROVIDER_REQUESTS_MONTHLY_LIMIT, server/utils/quotaStore.ts) — cette
    // ligne dit seulement "vous en recevez", le détail chiffré est dans
    // PLAN_COMPARISON ci-dessous plutôt que de promettre "illimité" à tort.
    { labelKey: 'requestReception', included: receptionDemandes },
    // Le badge « Vérifié » vient de la vérification d'identité
    // (server/utils/verificationStore.ts), pas de la formule choisie : il
    // est donc identique quelle que soit la formule, et n'est plus un
    // paramètre de cette fonction.
    { labelKey: 'verifiedBadge', included: true },
    { labelKey: 'featured', included: miseEnAvant },
    { labelKey: 'prioritySupport', included: supportPrioritaire },
  ]
}

export const PLANS: [Plan, Plan, Plan] = [
  {
    slug: 'mensuel',
    price: 5000,
    priceLabel: '5 000 FCFA',
    hasTag: false,
    durationDays: 30,
    features: features(true, true, false, false),
  },
  {
    slug: 'trimestriel',
    price: 13500,
    priceLabel: '13 500 FCFA',
    hasTag: true,
    durationDays: 90,
    features: features(true, true, false, true),
  },
  {
    slug: 'annuel',
    price: 48000,
    priceLabel: '48 000 FCFA',
    hasTag: true,
    durationDays: 365,
    features: features(true, true, true, true),
  },
]

export function findPlan(slug: string): Plan | undefined {
  return PLANS.find((plan) => plan.slug === slug)
}

/**
 * Valeur d'une ligne du tableau comparatif : coche/croix, ou une clé de
 * traduction (avec paramètres optionnels, ex. `{ count: 5 }`) quand la
 * formule varie plus finement qu'un simple oui/non — jamais un texte
 * littéral, voir #i18n.
 */
export type PlanComparisonValue = boolean | { key: string, params?: Record<string, number> }

export interface PlanComparisonRow {
  labelKey: string
  values: Record<PlanSlug, PlanComparisonValue>
}

export interface PlanComparisonCategory {
  titleKey: string
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
    titleKey: 'visibility',
    rows: [
      { labelKey: 'visibleInResults', values: { mensuel: true, trimestriel: true, annuel: true } },
      { labelKey: 'verifiedBadgeAllPlans', values: { mensuel: true, trimestriel: true, annuel: true } },
      // Réservée aux prestations réglées via la plateforme (#267, CGU art. 8)
      // — un même prestataire ne conserve pas cet avantage pour une mission
      // convenue ou payée en dehors de WorkTogo.
      { labelKey: 'featuredResults', values: { mensuel: false, trimestriel: false, annuel: true } },
    ],
  },
  {
    titleKey: 'clientRequests',
    rows: [
      {
        labelKey: 'requestsPerMonth',
        values: {
          mensuel: { key: 'plans.comparison.requestsPerMonthValue', params: { count: 5 } },
          trimestriel: { key: 'plans.comparison.requestsPerMonthValue', params: { count: 20 } },
          annuel: { key: 'plans.comparison.requestsUnlimited' },
        },
      },
      { labelKey: 'builtInMessaging', values: { mensuel: true, trimestriel: true, annuel: true } },
      { labelKey: 'firstContactForm', values: { mensuel: true, trimestriel: true, annuel: true } },
    ],
  },
  {
    titleKey: 'reputation',
    rows: [
      { labelKey: 'reviewsReceived', values: { mensuel: true, trimestriel: true, annuel: true } },
      { labelKey: 'averageRating', values: { mensuel: true, trimestriel: true, annuel: true } },
    ],
  },
  {
    titleKey: 'paymentSupport',
    rows: [
      { labelKey: 'mobileMoneyPayment', values: { mensuel: true, trimestriel: true, annuel: true } },
      // Identique quelle que soit la formule (pas un argument de vente entre
      // formules) : la garantie tient à l'usage de la plateforme, pas à
      // l'abonnement souscrit — voir CGU art. 8 (#267).
      { labelKey: 'paymentGuarantee', values: { mensuel: true, trimestriel: true, annuel: true } },
      {
        labelKey: 'chatSupport',
        values: {
          mensuel: { key: 'plans.comparison.chatSupportStandard' },
          trimestriel: { key: 'plans.comparison.chatSupportPriority' },
          annuel: { key: 'plans.comparison.chatSupportPriority' },
        },
      },
      {
        labelKey: 'freeTrialFirstSubscription',
        values: {
          mensuel: { key: 'plans.comparison.freeTrialDays', params: { days: 14 } },
          trimestriel: { key: 'plans.comparison.freeTrialDays', params: { days: 14 } },
          annuel: { key: 'plans.comparison.freeTrialDays', params: { days: 14 } },
        },
      },
    ],
  },
]
