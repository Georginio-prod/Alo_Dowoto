/** Reprise fidèle de `app/data/plans.ts` (backend inchangé). */
export type PlanSlug = 'mensuel' | 'trimestriel' | 'annuel'

export interface Plan {
  slug: PlanSlug
  price: number
  priceLabel: string
  hasTag: boolean
  durationDays: number
  /** Quota de demandes reçues / mois (PROVIDER_REQUESTS_MONTHLY_LIMIT). null = illimité. */
  requestsPerMonth: number | null
}

/** Urgence d'une demande (createServiceRequestSchema). */
export type Urgency = 'immediate' | 'semaine' | 'flexible'

/** Cycle de vie escrow (server/utils/escrowOrderStore.ts). */
export type EscrowStatus =
  | 'awaiting_payment'
  | 'in_escrow'
  | 'delivered'
  | 'released'
  | 'refunded'
  | 'disputed'
