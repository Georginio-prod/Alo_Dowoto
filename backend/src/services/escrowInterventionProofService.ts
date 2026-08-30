import { escrowOrderRepository, type EscrowOrder } from '../repositories/escrowOrderRepository'
import { getEscrowOrderByConversationId } from './escrowOrderService'

/**
 * Preuve d'intervention in-app (#268, anti-fuite) : le prestataire enregistre
 * son arrivée (check-in) puis son départ (check-out). Portée iso depuis
 * `server/utils/escrowInterventionProof.ts` (ADR-0016). `markEscrowOrderDelivered`
 * refuse de progresser tant que les deux horodatages ne sont pas enregistrés.
 */

export type CheckInResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'already_checked_in' }

/** Le prestataire enregistre son arrivée sur le lieu d'intervention. Iso Nitro. */
export async function recordEscrowOrderCheckIn(conversationId: string, location: { lat: number; lng: number } | null): Promise<CheckInResult> {
  const order = await getEscrowOrderByConversationId(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (order.checkInAt !== null) return { ok: false, error: 'already_checked_in' }

  const now = Date.now()
  await escrowOrderRepository.update(order.id, { checkInAt: new Date(now), checkInLat: location?.lat ?? null, checkInLng: location?.lng ?? null })
  return { ok: true, order: { ...order, checkInAt: now, checkInLocation: location } }
}

export type CheckOutResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'check_in_required' | 'already_checked_out' }

/** Le prestataire enregistre son départ — requiert un check-in préalable. Iso Nitro. */
export async function recordEscrowOrderCheckOut(conversationId: string, location: { lat: number; lng: number } | null): Promise<CheckOutResult> {
  const order = await getEscrowOrderByConversationId(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (order.checkInAt === null) return { ok: false, error: 'check_in_required' }
  if (order.checkOutAt !== null) return { ok: false, error: 'already_checked_out' }

  const now = Date.now()
  await escrowOrderRepository.update(order.id, { checkOutAt: new Date(now), checkOutLat: location?.lat ?? null, checkOutLng: location?.lng ?? null })
  return { ok: true, order: { ...order, checkOutAt: now, checkOutLocation: location } }
}
