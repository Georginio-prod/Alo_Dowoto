import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  ESCROW_REVIEW_THRESHOLD_AMOUNT,
  evaluateOrderRisk,
  listFraudAlerts,
  MAX_ESCROW_ORDER_AMOUNT,
  RAPID_ORDERS_ALERT_THRESHOLD,
} from '~~/server/utils/fraudDetection'

function id(): string {
  return randomUUID()
}

describe('evaluateOrderRisk (#277, règles anti-fraude de base)', () => {
  it('laisse passer un montant ordinaire sans historique récent', () => {
    const result = evaluateOrderRisk({ clientId: id(), providerId: id(), amount: 5000, recentOrderTimestamps: [] })
    expect(result.blocked).toBe(false)
  })

  it('bloque un montant dépassant le plafond absolu et journalise une alerte', () => {
    const clientId = id()
    const before = listFraudAlerts().length

    const result = evaluateOrderRisk({
      clientId,
      providerId: id(),
      amount: MAX_ESCROW_ORDER_AMOUNT + 1,
      recentOrderTimestamps: [],
    })

    expect(result).toEqual({
      blocked: true,
      reason: expect.stringContaining('plafond'),
    })
    const alerts = listFraudAlerts()
    expect(alerts.length).toBe(before + 1)
    expect(alerts[0]?.clientId).toBe(clientId)
    expect(alerts[0]?.reason).toBe('amount_ceiling')
  })

  it('autorise mais journalise un montant atteignant le seuil de revue manuelle', () => {
    const clientId = id()
    const result = evaluateOrderRisk({
      clientId,
      providerId: id(),
      amount: ESCROW_REVIEW_THRESHOLD_AMOUNT,
      recentOrderTimestamps: [],
    })

    expect(result.blocked).toBe(false)
    expect(listFraudAlerts().some((a) => a.clientId === clientId && a.reason === 'review_threshold')).toBe(true)
  })

  it('n’journalise pas un montant sous le seuil de revue', () => {
    const clientId = id()
    evaluateOrderRisk({ clientId, providerId: id(), amount: ESCROW_REVIEW_THRESHOLD_AMOUNT - 1, recentOrderTimestamps: [] })
    expect(listFraudAlerts().some((a) => a.clientId === clientId)).toBe(false)
  })

  it('autorise mais journalise un rythme de création de commandes anormal', () => {
    const clientId = id()
    const now = Date.now()
    const recentOrderTimestamps = Array.from({ length: RAPID_ORDERS_ALERT_THRESHOLD }, () => now)

    const result = evaluateOrderRisk({ clientId, providerId: id(), amount: 3000, recentOrderTimestamps })

    expect(result.blocked).toBe(false)
    expect(listFraudAlerts().some((a) => a.clientId === clientId && a.reason === 'rapid_orders')).toBe(true)
  })

  it('n’journalise pas un rythme sous le seuil d’alerte', () => {
    const clientId = id()
    const now = Date.now()
    const recentOrderTimestamps = Array.from({ length: RAPID_ORDERS_ALERT_THRESHOLD - 1 }, () => now)

    evaluateOrderRisk({ clientId, providerId: id(), amount: 3000, recentOrderTimestamps })

    expect(listFraudAlerts().some((a) => a.clientId === clientId)).toBe(false)
  })

  it('ignore les commandes récentes hors de la fenêtre de temps', () => {
    const clientId = id()
    const longAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentOrderTimestamps = Array.from({ length: RAPID_ORDERS_ALERT_THRESHOLD + 2 }, () => longAgo)

    evaluateOrderRisk({ clientId, providerId: id(), amount: 3000, recentOrderTimestamps })

    expect(listFraudAlerts().some((a) => a.clientId === clientId)).toBe(false)
  })
})
