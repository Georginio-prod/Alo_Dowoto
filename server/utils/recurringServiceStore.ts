import type { RecurringService as PrismaRecurringService } from '@prisma/client'
import { addSystemMessage } from '~~/server/utils/conversationStore'
import { createEscrowOrder, getEscrowOrderByConversationId, payEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { prisma } from '~~/server/utils/prisma'

/**
 * Offres récurrentes natives (#271) : un chercheur peut mettre en place un
 * prélèvement automatique périodique auprès d'un prestataire déjà contacté,
 * pour un service régulier (ménage hebdomadaire, jardinage mensuel…), sans
 * jamais quitter la plateforme entre deux occurrences. Persisté en base
 * (Prisma/SQLite, #342, ADR 0013) : les offres récurrentes survivent désormais
 * aux redémarrages du serveur.
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

function toRecurringService(row: PrismaRecurringService): RecurringService {
  return {
    id: row.id,
    conversationId: row.conversationId,
    clientId: row.clientId,
    providerId: row.providerId,
    amount: row.amount,
    frequency: row.frequency as RecurringFrequency,
    status: row.status as RecurringServiceStatus,
    createdAt: row.createdAt.getTime(),
    lastChargedAt: row.lastChargedAt?.getTime() ?? null,
    nextChargeAt: row.nextChargeAt.getTime(),
    cancelledAt: row.cancelledAt?.getTime() ?? null,
  }
}

export type CreateRecurringServiceResult =
  | { ok: true; service: RecurringService }
  | { ok: false; error: 'already_active' }

/**
 * Crée (ou relance, si la précédente a été annulée/a échoué) un service
 * récurrent. La première échéance est immédiatement due (`nextChargeAt =
 * Date.now()`) : elle se déclenchera au prochain accès via
 * `getRecurringServiceByConversationId`.
 */
export async function createRecurringService(input: {
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  frequency: RecurringFrequency
}): Promise<CreateRecurringServiceResult> {
  const existing = await prisma.recurringService.findUnique({ where: { conversationId: input.conversationId } })
  if (existing && existing.status === 'active') return { ok: false, error: 'already_active' }
  // Conversation unique en base : une offre terminée/échouée est remplacée par
  // la relance (même sémantique que l'ancien `Map.set`, qui écrasait l'entrée).
  if (existing) await prisma.recurringService.delete({ where: { conversationId: input.conversationId } })

  const now = Date.now()
  const row = await prisma.recurringService.create({
    data: {
      conversationId: input.conversationId,
      clientId: input.clientId,
      providerId: input.providerId,
      amount: input.amount,
      frequency: input.frequency,
      status: 'active',
      // Horodatages applicatifs (mockables dans les tests) plutôt que `now()` côté base.
      createdAt: new Date(now),
      nextChargeAt: new Date(now),
    },
  })
  return { ok: true, service: toRecurringService(row) }
}

export type CancelRecurringServiceResult = { ok: true; service: RecurringService } | { ok: false; error: 'not_found' | 'invalid_status' }

export async function cancelRecurringService(conversationId: string): Promise<CancelRecurringServiceResult> {
  const existing = await prisma.recurringService.findUnique({ where: { conversationId } })
  if (!existing) return { ok: false, error: 'not_found' }
  if (existing.status !== 'active' && existing.status !== 'payment_failed') return { ok: false, error: 'invalid_status' }

  const row = await prisma.recurringService.update({
    where: { conversationId },
    data: { status: 'cancelled', cancelledAt: new Date(Date.now()) },
  })
  return { ok: true, service: toRecurringService(row) }
}

const TERMINAL_ORDER_STATUSES = new Set(['released', 'refunded'])

/**
 * Déclenche le prélèvement dû, le cas échéant, et renvoie l'état à jour du
 * service. Ne fait rien tant que le cycle précédent (commande escrow de la
 * dernière échéance) n'est pas terminal — évite d'empiler une nouvelle commande
 * sur une prestation pas encore validée ou en litige. En cas de solde
 * insuffisant, le service passe en `payment_failed` (le chercheur doit
 * recharger puis relancer) plutôt que de réessayer indéfiniment à chaque accès.
 */
async function applyDueChargeIfNeeded(service: RecurringService): Promise<RecurringService> {
  if (service.status !== 'active') return service
  if (Date.now() < service.nextChargeAt) return service

  const existingOrder = await getEscrowOrderByConversationId(service.conversationId)
  if (existingOrder && !TERMINAL_ORDER_STATUSES.has(existingOrder.status)) return service

  await createEscrowOrder({
    conversationId: service.conversationId,
    clientId: service.clientId,
    providerId: service.providerId,
    amount: service.amount,
  })
  const result = await payEscrowOrder(service.conversationId)

  if (result.ok) {
    const now = Date.now()
    const row = await prisma.recurringService.update({
      where: { conversationId: service.conversationId },
      data: { lastChargedAt: new Date(now), nextChargeAt: new Date(now + FREQUENCY_INTERVAL_MS[service.frequency]) },
    })
    await addSystemMessage(
      service.conversationId,
      `Prélèvement automatique de ${service.amount.toLocaleString('fr-FR')} F CFA effectué pour votre service récurrent (${service.frequency}).`,
      'text',
      { key: 'systemMessages.recurringDebited', params: { amount: service.amount, frequency: service.frequency } },
    )
    return toRecurringService(row)
  }

  const row = await prisma.recurringService.update({
    where: { conversationId: service.conversationId },
    data: { status: 'payment_failed' },
  })
  await addSystemMessage(
    service.conversationId,
    'Le prélèvement automatique de votre service récurrent a échoué (solde insuffisant). Rechargez votre portefeuille puis relancez le service récurrent.',
    'text',
    { key: 'systemMessages.recurringDebitFailed' },
  )
  return toRecurringService(row)
}

export async function getRecurringServiceByConversationId(conversationId: string): Promise<RecurringService | null> {
  const row = await prisma.recurringService.findUnique({ where: { conversationId } })
  if (!row) return null
  return applyDueChargeIfNeeded(toRecurringService(row))
}
