import { randomUUID } from 'node:crypto'

/**
 * Règles anti-fraude de base sur le circuit de paiement en séquestre (#277).
 * Volontairement simple : pas de détection de comptes liés (aucune donnée
 * d'appareil/IP n'est collectée dans ce prototype, voir « Hors scope » dans
 * la PR) — se limite à un plafond dur, un seuil de revue manuelle, et une
 * détection de rythme de création de commandes anormalement élevé.
 */

/** Montant maximal absolu d'une commande escrow — au-delà, la demande est bloquée (pas seulement journalisée). */
export const MAX_ESCROW_ORDER_AMOUNT = 1_000_000

/** À partir de ce montant, la commande est autorisée mais journalisée pour revue manuelle par l'équipe support. */
export const ESCROW_REVIEW_THRESHOLD_AMOUNT = 200_000

/** Fenêtre de temps sur laquelle est évalué le rythme de création de commandes (#277). */
export const RAPID_ORDERS_WINDOW_MS = 10 * 60 * 1000

/** Nombre de commandes créées par le même chercheur dans `RAPID_ORDERS_WINDOW_MS` à partir duquel une alerte est journalisée. */
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

const alerts: FraudAlert[] = []

export function logFraudAlert(input: { clientId: string, providerId: string, reason: FraudAlertReason, amount: number }): FraudAlert {
  const alert: FraudAlert = { id: randomUUID(), createdAt: Date.now(), ...input }
  alerts.push(alert)
  return alert
}

/** Alertes les plus récentes en premier, pour une future interface de revue par l'équipe support. */
export function listFraudAlerts(): FraudAlert[] {
  return [...alerts].sort((a, b) => b.createdAt - a.createdAt)
}

export type OrderRiskEvaluation =
  | { blocked: true, reason: string }
  | { blocked: false }

/**
 * Évalue le risque d'une nouvelle commande avant sa création (#277). Ne
 * bloque que le dépassement du plafond absolu ; le seuil de revue et le
 * rythme de création anormal sont journalisés (`logFraudAlert`) sans
 * empêcher la transaction — un montant élevé ou plusieurs demandes
 * rapprochées peuvent être parfaitement légitimes, seule une revue humaine
 * peut trancher.
 */
export function evaluateOrderRisk(input: {
  clientId: string
  providerId: string
  amount: number
  recentOrderTimestamps: number[]
}): OrderRiskEvaluation {
  if (input.amount > MAX_ESCROW_ORDER_AMOUNT) {
    logFraudAlert({ clientId: input.clientId, providerId: input.providerId, reason: 'amount_ceiling', amount: input.amount })
    return {
      blocked: true,
      reason: `Ce montant dépasse le plafond autorisé (${MAX_ESCROW_ORDER_AMOUNT.toLocaleString('fr-FR')} F CFA). Contactez le support pour une prestation de cette valeur.`,
    }
  }

  if (input.amount >= ESCROW_REVIEW_THRESHOLD_AMOUNT) {
    logFraudAlert({ clientId: input.clientId, providerId: input.providerId, reason: 'review_threshold', amount: input.amount })
  }

  const now = Date.now()
  const recentCount = input.recentOrderTimestamps.filter((timestamp) => now - timestamp < RAPID_ORDERS_WINDOW_MS).length
  if (recentCount >= RAPID_ORDERS_ALERT_THRESHOLD) {
    logFraudAlert({ clientId: input.clientId, providerId: input.providerId, reason: 'rapid_orders', amount: input.amount })
  }

  return { blocked: false }
}
