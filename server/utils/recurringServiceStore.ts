import { randomUUID } from 'node:crypto'
import { addSystemMessage } from '~~/server/utils/conversationStore'
import { createEscrowOrder, getEscrowOrderByConversationId, payEscrowOrder } from '~~/server/utils/escrowOrderStore'

/**
 * Offres récurrentes natives (#271) : un chercheur peut mettre en place un
 * prélèvement automatique périodique auprès d'un prestataire déjà contacté,
 * pour un service régulier (ménage hebdomadaire, jardinage mensuel…), sans
 * jamais quitter la plateforme entre deux occurrences. En mémoire, comme les
 * autres stores (pas de base de données encore en place, voir #45/#46).
 *
 * Chaque échéance réutilise le cycle de vie du paiement en séquestre déjà en
 * place (`createEscrowOrder` + `payEscrowOrder`, server/utils/escrowOrderStore.ts) :
 * la commande générée pour une échéance suit exactement le même parcours
 * (validation, litige éventuel) qu'une prestation ponctuelle. La prochaine
 * échéance n'est déclenchée que si la précédente est terminale
 * (`released`/`refunded`) — comme pour la reprise d'un prestataire (#266) —
 * sinon le prélèvement automatique attend la résolution du cycle en cours au
 * prochain accès plutôt que d'empiler les commandes.
 */

export type RecurringFrequency = 'hebdomadaire' | 'mensuelle'
export type RecurringServiceStatus = 'active' | 'payment_failed' | 'cancelled'

export interface RecurringService {
  id: string
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  frequency: RecurringFrequency
  status: RecurringServiceStatus
  createdAt: number
  lastChargedAt: number | null
  nextChargeAt: number
  cancelledAt: number | null
}

const FREQUENCY_INTERVAL_MS: Record<RecurringFrequency, number> = {
  hebdomadaire: 7 * 24 * 60 * 60 * 1000,
  mensuelle: 30 * 24 * 60 * 60 * 1000,
}

const servicesByConversationId = new Map<string, RecurringService>()

export type CreateRecurringServiceResult =
  | { ok: true; service: RecurringService }
  | { ok: false; error: 'already_active' }

/**
 * Crée (ou relance, si la précédente a été annulée/a échoué) un service
 * récurrent. La première échéance est immédiatement due (`nextChargeAt =
 * Date.now()`) : elle se déclenchera au prochain accès via
 * `getRecurringServiceByConversationId`.
 */
export function createRecurringService(input: {
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  frequency: RecurringFrequency
}): CreateRecurringServiceResult {
  const existing = servicesByConversationId.get(input.conversationId)
  if (existing && existing.status === 'active') return { ok: false, error: 'already_active' }

  const service: RecurringService = {
    id: randomUUID(),
    conversationId: input.conversationId,
    clientId: input.clientId,
    providerId: input.providerId,
    amount: input.amount,
    frequency: input.frequency,
    status: 'active',
    createdAt: Date.now(),
    lastChargedAt: null,
    nextChargeAt: Date.now(),
    cancelledAt: null,
  }
  servicesByConversationId.set(input.conversationId, service)
  return { ok: true, service }
}

export type CancelRecurringServiceResult = { ok: true; service: RecurringService } | { ok: false; error: 'not_found' | 'invalid_status' }

export function cancelRecurringService(conversationId: string): CancelRecurringServiceResult {
  const service = servicesByConversationId.get(conversationId)
  if (!service) return { ok: false, error: 'not_found' }
  if (service.status !== 'active' && service.status !== 'payment_failed') return { ok: false, error: 'invalid_status' }

  service.status = 'cancelled'
  service.cancelledAt = Date.now()
  return { ok: true, service }
}

const TERMINAL_ORDER_STATUSES = new Set(['released', 'refunded'])

/**
 * Déclenche le prélèvement dû, le cas échéant. Ne fait rien tant que le
 * cycle précédent (commande escrow de la dernière échéance) n'est pas
 * terminal — évite d'empiler une nouvelle commande sur une prestation pas
 * encore validée ou en litige. En cas de solde insuffisant, le service passe
 * en `payment_failed` (le chercheur doit recharger puis relancer) plutôt que
 * de réessayer indéfiniment à chaque accès.
 */
async function applyDueChargeIfNeeded(service: RecurringService): Promise<void> {
  if (service.status !== 'active') return
  if (Date.now() < service.nextChargeAt) return

  const existingOrder = await getEscrowOrderByConversationId(service.conversationId)
  if (existingOrder && !TERMINAL_ORDER_STATUSES.has(existingOrder.status)) return

  await createEscrowOrder({
    conversationId: service.conversationId,
    clientId: service.clientId,
    providerId: service.providerId,
    amount: service.amount,
  })
  const result = await payEscrowOrder(service.conversationId)

  if (result.ok) {
    service.lastChargedAt = Date.now()
    service.nextChargeAt = Date.now() + FREQUENCY_INTERVAL_MS[service.frequency]
    await addSystemMessage(
      service.conversationId,
      `Prélèvement automatique de ${service.amount.toLocaleString('fr-FR')} F CFA effectué pour votre service récurrent (${service.frequency}).`,
      'text',
      { key: 'systemMessages.recurringDebited', params: { amount: service.amount, frequency: service.frequency } },
    )
  } else {
    service.status = 'payment_failed'
    await addSystemMessage(
      service.conversationId,
      'Le prélèvement automatique de votre service récurrent a échoué (solde insuffisant). Rechargez votre portefeuille puis relancez le service récurrent.',
      'text',
      { key: 'systemMessages.recurringDebitFailed' },
    )
  }
}

export async function getRecurringServiceByConversationId(conversationId: string): Promise<RecurringService | null> {
  const service = servicesByConversationId.get(conversationId) ?? null
  if (service) await applyDueChargeIfNeeded(service)
  return service
}
