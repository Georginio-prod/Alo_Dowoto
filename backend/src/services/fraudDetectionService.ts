import { fraudAlertRepository } from '../repositories/fraudAlertRepository'

/**
 * Règles anti-fraude de base sur le circuit de paiement en séquestre (#277).
 * Les alertes sont conservées dans PostgreSQL : plafond dur, seuil de revue
 * manuelle et détection d'un rythme de création de commandes anormal.
 */

/** Montant maximal absolu d'une commande escrow — au-delà, la demande est bloquée. */
export const MAX_ESCROW_ORDER_AMOUNT = 1_000_000

/** À partir de ce montant, la commande est autorisée mais journalisée pour revue manuelle. */
export const ESCROW_REVIEW_THRESHOLD_AMOUNT = 200_000

/** Fenêtre d'évaluation du rythme de création de commandes (#277). */
export const RAPID_ORDERS_WINDOW_MS = 10 * 60 * 1000

/** Nombre de commandes dans la fenêtre à partir duquel une alerte est journalisée. */
export const RAPID_ORDERS_ALERT_THRESHOLD = 3

export type FraudAlertReason = 'amount_ceiling' | 'review_threshold' | 'rapid_orders'

export interface FraudAlert {
  id: string
  clientId: string
  providerId: string
  reason: FraudAlertReason
  amount: number
  createdAt: number
}

function toFraudAlert(row: { id: string; clientId: string; providerId: string; reason: string; amount: number; createdAt: Date }): FraudAlert {
  return {
    id: row.id,
    clientId: row.clientId,
    providerId: row.providerId,
    reason: row.reason as FraudAlertReason,
    amount: row.amount,
    createdAt: row.createdAt.getTime(),
  }
}

export async function logFraudAlert(input: { clientId: string; providerId: string; reason: FraudAlertReason; amount: number }): Promise<FraudAlert> {
  return toFraudAlert(await fraudAlertRepository.create(input))
}

/** Alertes les plus récentes en premier, pour une future interface de revue support. */
export async function listFraudAlerts(): Promise<FraudAlert[]> {
  return (await fraudAlertRepository.list()).map(toFraudAlert)
}

export type OrderRiskEvaluation = { blocked: true; reason: string } | { blocked: false }

/**
 * Évalue le risque d'une nouvelle commande avant sa création (#277). Ne bloque
 * que le dépassement du plafond absolu ; le seuil de revue et le rythme anormal
 * sont journalisés sans empêcher la transaction. Iso Nitro.
 */
export async function evaluateOrderRisk(input: {
  clientId: string
  providerId: string
  amount: number
  recentOrderTimestamps: number[]
}): Promise<OrderRiskEvaluation> {
  if (input.amount > MAX_ESCROW_ORDER_AMOUNT) {
    await logFraudAlert({ clientId: input.clientId, providerId: input.providerId, reason: 'amount_ceiling', amount: input.amount })
    return {
      blocked: true,
      reason: `Ce montant dépasse le plafond autorisé (${MAX_ESCROW_ORDER_AMOUNT.toLocaleString('fr-FR')} F CFA). Contactez le support pour une prestation de cette valeur.`,
    }
  }

  if (input.amount >= ESCROW_REVIEW_THRESHOLD_AMOUNT) {
    await logFraudAlert({ clientId: input.clientId, providerId: input.providerId, reason: 'review_threshold', amount: input.amount })
  }

  const now = Date.now()
  const recentCount = input.recentOrderTimestamps.filter((timestamp) => now - timestamp < RAPID_ORDERS_WINDOW_MS).length
  if (recentCount >= RAPID_ORDERS_ALERT_THRESHOLD) {
    await logFraudAlert({ clientId: input.clientId, providerId: input.providerId, reason: 'rapid_orders', amount: input.amount })
  }

  return { blocked: false }
}
