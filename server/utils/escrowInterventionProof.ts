import { getEscrowOrderByConversationId, type EscrowOrder } from '~~/server/utils/escrowOrderStore'

/**
 * Preuve d'intervention in-app (#268, anti-fuite) : le prestataire enregistre
 * son arrivée (check-in) puis son départ (check-out) du lieu d'intervention.
 * `markEscrowOrderDelivered` (server/utils/escrowOrderStore.ts) refuse de
 * faire progresser la commande tant que les deux ne sont pas enregistrés —
 * c'est ce qui empêche de déclencher le processus de libération du paiement
 * sans preuve qu'une intervention a bien eu lieu via la plateforme.
 *
 * Extrait dans son propre fichier (plutôt que dans escrowOrderStore.ts) pour
 * rester sous la limite ESLint `max-lines` (300) — mute directement l'objet
 * `EscrowOrder` renvoyé par `getEscrowOrderByConversationId`, qui est la
 * référence vivante stockée dans le Map interne du store, pas une copie.
 */

export type CheckInResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'already_checked_in' }

/** Le prestataire enregistre son arrivée sur le lieu d'intervention. */
export function recordEscrowOrderCheckIn(conversationId: string, location: { lat: number; lng: number } | null): CheckInResult {
  const order = getEscrowOrderByConversationId(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (order.checkInAt !== null) return { ok: false, error: 'already_checked_in' }

  order.checkInAt = Date.now()
  order.checkInLocation = location
  return { ok: true, order }
}

export type CheckOutResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'check_in_required' | 'already_checked_out' }

/** Le prestataire enregistre son départ du lieu d'intervention — requiert un check-in préalable. */
export function recordEscrowOrderCheckOut(conversationId: string, location: { lat: number; lng: number } | null): CheckOutResult {
  const order = getEscrowOrderByConversationId(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (order.checkInAt === null) return { ok: false, error: 'check_in_required' }
  if (order.checkOutAt !== null) return { ok: false, error: 'already_checked_out' }

  order.checkOutAt = Date.now()
  order.checkOutLocation = location
  return { ok: true, order }
}
