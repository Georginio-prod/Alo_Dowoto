import {
  addSystemMessage,
  findLatestUnresolvedMessage,
  findOrCreateConversation,
  getClientContact,
  markFirstContactDone,
  resolveMessage,
  setClientContact,
} from '~~/server/utils/conversationStore'
import {
  createEscrowOrder,
  type EscrowOrder,
  PROVIDER_RESPONSE_TIMEOUT_MS,
} from '~~/server/utils/escrowOrderStore'
import {
  getEffectiveRating,
  getProviderById,
  type ProviderSearchResult,
  resolveProviderRate,
  searchProviders,
} from '~~/server/utils/providerDirectory'
import { prisma } from '~~/server/utils/prisma'
import { creditWallet } from '~~/server/utils/walletStore'

/**
 * Réattribution automatique après paiement (#289) — extrait d'escrowOrderStore.ts
 * pour rester sous la limite de lignes par fichier, sur le même modèle que
 * escrowDisputeResolution.ts. `applyAutoReassignmentIfExpired` y est réimportée
 * pour la brancher dans la chaîne de vérifications paresseuses de
 * `getEscrowOrderByConversationId`.
 */

/**
 * Prochain prestataire disponible du même secteur/ville qu'un prestataire donné
 * (#289), classé par note effective décroissante. `null` si aucune alternative.
 */
function findNextAvailableProvider(currentProviderId: string): ProviderSearchResult | null {
  const current = getProviderById(currentProviderId)
  if (!current) return null

  const alternatives = searchProviders({ sector: current.sector, city: current.city }).filter(
    (provider) => provider.id !== currentProviderId,
  )
  if (alternatives.length === 0) return null

  const ranked = alternatives
    .map((provider) => ({ provider, ...getEffectiveRating(provider.id) }))
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
  return ranked[0]?.provider ?? null
}

/**
 * Réattribution automatique (#289) : si le prestataire n'a pas confirmé la prise
 * en charge dans le délai imparti après paiement, la commande en cours est
 * remboursée et une nouvelle demande est proposée au prestataire suivant, sur
 * une nouvelle conversation. Le chercheur garde la main : la nouvelle commande
 * reste `awaiting_payment`, à confirmer par un nouveau paiement.
 */
export async function applyAutoReassignmentIfExpired(order: EscrowOrder): Promise<EscrowOrder> {
  if (order.status !== 'in_escrow' || order.paidAt === null) return order
  if (Date.now() - order.paidAt < PROVIDER_RESPONSE_TIMEOUT_MS) return order

  const pendingConfirmation = await findLatestUnresolvedMessage(order.conversationId, 'order_confirmation')
  if (!pendingConfirmation) return order

  const nextProvider = findNextAvailableProvider(order.providerId)
  if (!nextProvider) {
    const body = "Le prestataire n'a pas répondu à temps et aucune alternative n'est disponible pour le moment. Vous pouvez annuler cette commande ou réessayer plus tard."
    await addSystemMessage(order.conversationId, body, 'text', { key: 'systemMessages.noResponseNoAlternative' })
    return order
  }

  const now = Date.now()
  const cancelReason = "Réattribution automatique : le prestataire n'a pas confirmé la prise en charge à temps."

  // Atomicité (#366) : remboursement + passage `refunded` tout ou rien, avec
  // relecture idempotente. Si un autre chemin (annulation manuelle, appel
  // concurrent) a déjà quitté `in_escrow`, on n'effectue ni remboursement en
  // double ni réattribution.
  const applied = await prisma.$transaction(async (tx) => {
    const fresh = await tx.escrowOrder.findUnique({ where: { id: order.id } })
    if (!fresh || fresh.status !== 'in_escrow') return false
    await creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: order.amount, reference: order.id, counterpartyUserId: order.providerId }, tx)
    await tx.escrowOrder.update({ where: { id: order.id }, data: { status: 'refunded', cancelledAt: new Date(now), cancelReason } })
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

  const newAmount = resolveProviderRate(nextProvider.id) ?? order.amount
  await createEscrowOrder({ conversationId: newConversation.id, clientId: order.clientId, providerId: nextProvider.id, amount: newAmount })
  const awaitingBody = "Cette demande vous a été transmise automatiquement suite à l'absence de réponse d'un autre prestataire. Réglez le paiement pour la confirmer."
  await addSystemMessage(newConversation.id, awaitingBody, 'text', { key: 'systemMessages.autoReassignedAwaitingPayment' })
  return { ...order, status: 'refunded', cancelledAt: now, cancelReason }
}
