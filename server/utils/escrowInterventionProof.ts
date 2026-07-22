import { getEscrowOrderByConversationId, type EscrowOrder } from '~~/server/utils/escrowOrderStore'
import { prisma } from '~~/server/utils/prisma'

/**
 * Preuve d'intervention in-app (#268, anti-fuite) : le prestataire enregistre
 * son arrivée (check-in) puis son départ (check-out) du lieu d'intervention.
 * `markEscrowOrderDelivered` (server/utils/escrowOrderStore.ts) refuse de faire
 * progresser la commande tant que les deux ne sont pas enregistrés — c'est ce
 * qui empêche de déclencher la libération du paiement sans preuve qu'une
 * intervention a bien eu lieu via la plateforme.
 *
 * Extrait dans son propre fichier (plutôt que dans escrowOrderStore.ts) pour
 * rester sous la limite ESLint `max-lines` (300). Depuis #342 (ADR 0013), la
 * commande est persistée : la mise à jour passe par un `prisma.escrowOrder.update`
 * plutôt qu'une mutation d'objet en mémoire.
 */

export type CheckInResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'already_checked_in' }

/** Le prestataire enregistre son arrivée sur le lieu d'intervention. */
export async function recordEscrowOrderCheckIn(conversationId: string, location: { lat: number; lng: number } | null): Promise<CheckInResult> {
  const order = await getEscrowOrderByConversationId(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (order.checkInAt !== null) return { ok: false, error: 'already_checked_in' }

  const now = Date.now()
  await prisma.escrowOrder.update({
    where: { id: order.id },
    data: { checkInAt: new Date(now), checkInLat: location?.lat ?? null, checkInLng: location?.lng ?? null },
  })
  return { ok: true, order: { ...order, checkInAt: now, checkInLocation: location } }
}

export type CheckOutResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'check_in_required' | 'already_checked_out' }

/** Le prestataire enregistre son départ du lieu d'intervention — requiert un check-in préalable. */
export async function recordEscrowOrderCheckOut(conversationId: string, location: { lat: number; lng: number } | null): Promise<CheckOutResult> {
  const order = await getEscrowOrderByConversationId(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (order.checkInAt === null) return { ok: false, error: 'check_in_required' }
  if (order.checkOutAt !== null) return { ok: false, error: 'already_checked_out' }

  const now = Date.now()
  await prisma.escrowOrder.update({
    where: { id: order.id },
    data: { checkOutAt: new Date(now), checkOutLat: location?.lat ?? null, checkOutLng: location?.lng ?? null },
  })
  return { ok: true, order: { ...order, checkOutAt: now, checkOutLocation: location } }
}
