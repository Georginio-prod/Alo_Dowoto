import { randomUUID } from 'node:crypto'
import { addSystemMessage } from './conversationService'
import { createEscrowOrder, getEscrowOrderByConversationId, payEscrowOrder } from './escrowOrderService'
import {
  recurringServiceRepository,
  type RecurringServiceRepository,
  type StoredRecurringService,
} from '../repositories/recurringServiceRepository'

export type RecurringFrequency = 'hebdomadaire' | 'mensuelle'
export type RecurringServiceStatus = 'active' | 'payment_failed' | 'cancelled'

export interface RecurringService extends Omit<StoredRecurringService, 'frequency' | 'status'> {
  frequency: RecurringFrequency
  status: RecurringServiceStatus
}

const FREQUENCY_INTERVAL_MS: Record<RecurringFrequency, number> = {
  hebdomadaire: 7 * 24 * 60 * 60 * 1000,
  mensuelle: 30 * 24 * 60 * 60 * 1000,
}
const TERMINAL_ORDER_STATUSES = new Set(['released', 'refunded'])

function toService(service: StoredRecurringService): RecurringService {
  return { ...service, frequency: service.frequency as RecurringFrequency, status: service.status as RecurringServiceStatus }
}

export type CreateRecurringServiceResult =
  | { ok: true; service: RecurringService }
  | { ok: false; error: 'already_active' }
export type CancelRecurringServiceResult =
  | { ok: true; service: RecurringService }
  | { ok: false; error: 'not_found' | 'invalid_status' }

export function createRecurringServiceService(repository: RecurringServiceRepository = recurringServiceRepository) {
  async function applyDueChargeIfNeeded(service: RecurringService): Promise<RecurringService> {
    if (service.status !== 'active' || Date.now() < service.nextChargeAt) return service

    const existingOrder = await getEscrowOrderByConversationId(service.conversationId)
    if (existingOrder && !TERMINAL_ORDER_STATUSES.has(existingOrder.status)) return service

    await createEscrowOrder({
      conversationId: service.conversationId,
      clientId: service.clientId,
      providerId: service.providerId,
      amount: service.amount,
    })
    const result = await payEscrowOrder(service.conversationId)
    const now = Date.now()

    if (result.ok) {
      const updated = toService(await repository.update(service.id, {
        status: 'active',
        lastChargedAt: now,
        nextChargeAt: now + FREQUENCY_INTERVAL_MS[service.frequency],
        cancelledAt: null,
      }))
      await addSystemMessage(
        service.conversationId,
        `Prélèvement automatique de ${service.amount.toLocaleString('fr-FR')} F CFA effectué pour votre service récurrent (${service.frequency}).`,
        'text',
        { key: 'systemMessages.recurringDebited', params: { amount: service.amount, frequency: service.frequency } },
      )
      return updated
    }

    const updated = toService(await repository.update(service.id, {
      status: 'payment_failed',
      lastChargedAt: service.lastChargedAt,
      nextChargeAt: service.nextChargeAt,
      cancelledAt: null,
    }))
    await addSystemMessage(
      service.conversationId,
      'Le prélèvement automatique de votre service récurrent a échoué (solde insuffisant). Rechargez votre portefeuille puis relancez le service récurrent.',
      'text',
      { key: 'systemMessages.recurringDebitFailed' },
    )
    return updated
  }

  return {
    async createRecurringService(input: {
      conversationId: string
      clientId: string
      providerId: string
      amount: number
      frequency: RecurringFrequency
    }): Promise<CreateRecurringServiceResult> {
      const existing = await repository.findByConversationId(input.conversationId)
      if (existing?.status === 'active') return { ok: false, error: 'already_active' }
      const now = Date.now()
      const service = toService(await repository.upsert({
        id: existing?.id ?? randomUUID(),
        ...input,
        status: 'active',
        createdAt: existing?.createdAt ?? now,
        lastChargedAt: null,
        nextChargeAt: now,
        cancelledAt: null,
      }))
      return { ok: true, service }
    },
    async cancelRecurringService(conversationId: string): Promise<CancelRecurringServiceResult> {
      const existing = await repository.findByConversationId(conversationId)
      if (!existing) return { ok: false, error: 'not_found' }
      const service = toService(existing)
      if (service.status !== 'active' && service.status !== 'payment_failed') return { ok: false, error: 'invalid_status' }
      const now = Date.now()
      return {
        ok: true,
        service: toService(await repository.update(service.id, {
          status: 'cancelled',
          lastChargedAt: service.lastChargedAt,
          nextChargeAt: service.nextChargeAt,
          cancelledAt: now,
        })),
      }
    },
    async getRecurringServiceByConversationId(conversationId: string): Promise<RecurringService | null> {
      const service = await repository.findByConversationId(conversationId)
      return service ? applyDueChargeIfNeeded(toService(service)) : null
    },
  }
}

export const recurringServiceService = createRecurringServiceService()
export const createRecurringService = recurringServiceService.createRecurringService
export const cancelRecurringService = recurringServiceService.cancelRecurringService
export const getRecurringServiceByConversationId = recurringServiceService.getRecurringServiceByConversationId
