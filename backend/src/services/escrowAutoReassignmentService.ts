import { escrowOrderRepository, type EscrowOrder } from '../repositories/escrowOrderRepository'
import { walletMovementRepository } from '../repositories/walletMovementRepository'
import {
  addSystemMessage,
  findLatestUnresolvedMessage,
  findOrCreateConversation,
  getClientContact,
  markFirstContactDone,
  resolveMessage,
  setClientContact,
} from './conversationService'
import { createEscrowOrder, PROVIDER_RESPONSE_TIMEOUT_MS } from './escrowOrderService'
import {
  getEffectiveRating,
  getProviderById,
  resolveProviderRate,
  searchProviders,
  type ProviderSearchResult,
} from './providerDirectoryService'

/**
 * Réattribution automatique après paiement (#289), portée iso depuis
 * `server/utils/escrowAutoReassignment.ts` (ADR-0016). Extraite d'`escrowOrderService`
 * (limite de lignes) ; `applyAutoReassignmentIfExpired` y est réimportée pour la
 * chaîne de vérifications paresseuses de `getEscrowOrderByConversationId`.
 */

/** Prochain prestataire disponible du même secteur/ville, classé par note effective. `null` si aucun. */
async function findNextAvailableProvider(currentProviderId: string): Promise<ProviderSearchResult | null> {
  const current = await getProviderById(currentProviderId)
  if (!current) return null

  const alternatives = (await searchProviders({ sector: current.sector, city: current.city })).filter(
    (provider) => provider.id !== currentProviderId,
  )
  if (alternatives.length === 0) return null

  const ranked = (
    await Promise.all(
      alternatives.map(async (provider) => ({ provider, ...(await getEffectiveRating(provider.id, { rating: provider.rating, reviewCount: provider.reviewCount })) })),
    )
  ).sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
  return ranked[0]?.provider ?? null
}

/**
 * Si le prestataire n'a pas confirmé dans le délai imparti après paiement, la
 * commande est remboursée et une nouvelle demande est proposée au prestataire
 * suivant, sur une nouvelle conversation (reste `awaiting_payment`). Iso Nitro.
 */
export async function applyAutoReassignmentIfExpired(order: EscrowOrder): Promise<EscrowOrder> {
  if (order.status !== 'in_escrow' || order.paidAt === null) return order
  if (Date.now() - order.paidAt < PROVIDER_RESPONSE_TIMEOUT_MS) return order

  const pendingConfirmation = await findLatestUnresolvedMessage(order.conversationId, 'order_confirmation')
  if (!pendingConfirmation) return order

  const nextProvider = await findNextAvailableProvider(order.providerId)
  if (!nextProvider) {
    const body = "Le prestataire n'a pas répondu à temps et aucune alternative n'est disponible pour le moment. Vous pouvez annuler cette commande ou réessayer plus tard."
    await addSystemMessage(order.conversationId, body, 'text', { key: 'systemMessages.noResponseNoAlternative' })
    return order
  }

  const now = Date.now()
  const cancelReason = "Réattribution automatique : le prestataire n'a pas confirmé la prise en charge à temps."

  // Atomicité (#366) : remboursement + passage `refunded` tout ou rien, relecture idempotente.
  const applied = await escrowOrderRepository.transaction(async (tx) => {
    const fresh = await escrowOrderRepository.findByIdIn(tx, order.id)
    if (!fresh || fresh.status !== 'in_escrow') return false
    await walletMovementRepository.credit({ walletUserId: order.clientId, type: 'escrow_refund', amount: order.amount, reference: order.id, counterpartyUserId: order.providerId }, tx)
    await escrowOrderRepository.update(order.id, { status: 'refunded', cancelledAt: new Date(now), cancelReason }, tx)
    return true
  })
  if (!applied) return order

  await resolveMessage(order.conversationId, pendingConfirmation.id)
  const reassignBody = `Le prestataire n'a pas répondu à temps. Remboursement intégral effectué, et votre demande a été transmise automatiquement à ${nextProvider.displayName}.`
  await addSystemMessage(order.conversationId, reassignBody, 'text', {
    key: 'systemMessages.reassignedNoResponse',
    params: { providerName: nextProvider.displayName },
  })

  const newConversation = await findOrCreateConversation(order.clientId, nextProvider.id)
  const clientContact = await getClientContact(order.conversationId)
  if (clientContact) await setClientContact(newConversation.id, clientContact)
  await markFirstContactDone(newConversation.id)

  const newAmount = (await resolveProviderRate(nextProvider.id)) ?? order.amount
  await createEscrowOrder({ conversationId: newConversation.id, clientId: order.clientId, providerId: nextProvider.id, amount: newAmount })
  const awaitingBody = "Cette demande vous a été transmise automatiquement suite à l'absence de réponse d'un autre prestataire. Réglez le paiement pour la confirmer."
  await addSystemMessage(newConversation.id, awaitingBody, 'text', { key: 'systemMessages.autoReassignedAwaitingPayment' })
  return { ...order, status: 'refunded', cancelledAt: now, cancelReason }
}
