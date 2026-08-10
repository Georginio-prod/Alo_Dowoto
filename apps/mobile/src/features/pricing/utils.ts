import type { EscrowStatus, Plan, Urgency } from './types'
import type { BadgeTone } from '@/design-system'

/**
 * Logique de tarification et de formatage — PURE et testable, sans rendu
 * (règle d'architecture Phase 1). Reprend les valeurs réelles du backend.
 */

/** Formules d'abonnement prestataire (app/data/plans.ts). */
export const PLANS: readonly Plan[] = [
  {
    slug: 'mensuel',
    price: 5000,
    priceLabel: '5 000 FCFA',
    hasTag: false,
    durationDays: 30,
    requestsPerMonth: 5,
  },
  {
    slug: 'trimestriel',
    price: 13500,
    priceLabel: '13 500 FCFA',
    hasTag: true,
    durationDays: 90,
    requestsPerMonth: 20,
  },
  {
    slug: 'annuel',
    price: 48000,
    priceLabel: '48 000 FCFA',
    hasTag: true,
    durationDays: 365,
    requestsPerMonth: null, // illimité
  },
]

export function findPlan(slug: string): Plan | undefined {
  return PLANS.find((p) => p.slug === slug)
}

export const FREE_TRIAL_DAYS = 14
/** MAX_SIMULTANEOUS_UNPAID_ORDERS (escrowOrderStore.ts). */
export const MAX_UNPAID_ORDERS = 2

/**
 * Formatage monétaire FCFA (XOF) : entier, séparateur de milliers par espace
 * ASCII, suffixe « FCFA ». Reproduit le style « 5 000 FCFA » du web.
 */
export function formatFcfa(amount: number): string {
  const rounded = Math.round(amount)
  const sign = rounded < 0 ? '-' : ''
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${digits} FCFA`
}

/** Prix mensualisé d'une formule (aide à la comparaison). */
export function monthlyEquivalent(plan: Plan): number {
  return Math.round((plan.price / plan.durationDays) * 30)
}

/**
 * Estimation en direct de la fiche préalable (Phase 4). Le montant réel est
 * négocié/ajusté ensuite via l'escrow ; ceci n'est qu'une fourchette
 * indicative dérivée du budget max saisi et de l'urgence — n'engage pas le
 * backend, purement côté client pour guider la saisie.
 */
export interface EstimateInput {
  budgetMax: number
  urgency: Urgency
}

export interface Estimate {
  low: number
  high: number
  urgencyFactor: number
}

const URGENCY_FACTOR: Record<Urgency, number> = {
  immediate: 1.15, // intervention rapide : majoration indicative
  semaine: 1.0,
  flexible: 0.9, // souplesse : marge de négociation à la baisse
}

export function estimate({ budgetMax, urgency }: EstimateInput): Estimate {
  const factor = URGENCY_FACTOR[urgency]
  const base = Math.max(0, budgetMax)
  const high = Math.round(base * factor)
  const low = Math.round(base * factor * 0.7)
  return { low, high, urgencyFactor: factor }
}

/** Libellé/teinte d'un statut escrow (jamais couleur seule — StatusBadge). */
export function escrowLabel(status: EscrowStatus): { key: string; tone: BadgeTone; glyph: string } {
  switch (status) {
    case 'awaiting_payment':
      return { key: 'mission.status.awaitingPayment', tone: 'warning', glyph: '⏳' }
    case 'in_escrow':
      return { key: 'mission.status.inEscrow', tone: 'info', glyph: '🔒' }
    case 'delivered':
      return { key: 'mission.status.delivered', tone: 'info', glyph: '📦' }
    case 'released':
      return { key: 'mission.status.released', tone: 'success', glyph: '✓' }
    case 'refunded':
      return { key: 'mission.status.refunded', tone: 'neutral', glyph: '↩' }
    case 'disputed':
      return { key: 'mission.status.disputed', tone: 'danger', glyph: '!' }
  }
}

/** Transitions escrow autorisées (miroir client de la machine à états serveur). */
const TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  awaiting_payment: ['in_escrow', 'refunded'],
  in_escrow: ['delivered', 'refunded', 'disputed'],
  delivered: ['released', 'disputed'],
  released: [],
  refunded: [],
  disputed: ['released', 'refunded'],
}

export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Formatage de date court FR (fallback si Intl indisponible). */
export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(d)
  } catch {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }
}
