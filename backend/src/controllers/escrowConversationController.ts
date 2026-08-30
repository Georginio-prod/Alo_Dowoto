import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest, conflict, notFound, paymentRequired } from '../utils/apiError'
import { resolveProviderRate } from '../services/providerDirectoryService'
import {
  addMessage,
  addSystemMessage,
  findLatestUnresolvedMessage,
  resolveMessage,
} from '../services/conversationService'
import {
  cancelEscrowOrder,
  confirmEscrowOrderReceipt,
  createEscrowOrder,
  getEscrowOrderByConversationId,
  markEscrowOrderDelivered,
  openEscrowDispute,
  payEscrowOrder,
  respondToDispute,
} from '../services/escrowOrderService'
import { cancelEscrowOrderByClient } from '../services/escrowClientCancellationService'
import { confirmDisputeResolution } from '../services/escrowDisputeResolutionService'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '../services/escrowInterventionProofService'
import { cancelRecurringService, createRecurringService } from '../services/recurringServiceService'
import { requireParticipantConversation } from './conversationAccess'
import type {
  cancelEscrowSchema,
  checkInOutSchema,
  confirmDisputeResolutionSchema,
  disputeEscrowSchema,
  proposeRescheduleSchema,
  rebookSchema,
  recurringServiceSchema,
  respondDisputeSchema,
  shareLocationSchema,
} from '../validation/schemas/conversations'

/**
 * Actions du paiement en séquestre (#191…) : paiement, hub de messages
 * automatiques, livraison/validation, annulations, litiges, check-in/out,
 * reprogrammation, reprise et récurrence. Porté iso depuis
 * `server/api/conversations/[id]/**` (ADR-0016). Extrait de
 * `conversationController.ts` (limite de lignes). Rôle filtré par les gardes ;
 * appartenance revérifiée via `requireParticipantConversation`.
 */

/** POST /api/conversations/:id/pay (#194) — paiement bloquant en séquestre. */
export async function payOrder(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'client')

  const result = await payEscrowOrder(conversation.id)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à payer pour cette conversation.')
    if (result.error === 'already_paid') conflict('Cette commande a déjà été payée.')
    paymentRequired('Solde insuffisant : rechargez votre portefeuille WorkTogo avant de payer cette commande.')
  }

  await addSystemMessage(
    conversation.id,
    'Nouvelle demande transmise et payée par le chercheur. Confirmez-vous la prise en charge de cette commande ?',
    'order_confirmation',
    { key: 'systemMessages.paymentConfirmationPrompt' },
  )

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/confirm-order — le prestataire confirme la prise en charge. */
export async function confirmOrder(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'provider')

  const pending = await findLatestUnresolvedMessage(conversation.id, 'order_confirmation')
  if (!pending) conflict('Aucune demande de confirmation en attente pour cette conversation.')

  await resolveMessage(conversation.id, pending.id)
  const confirmation = await addSystemMessage(conversation.id, 'Le prestataire a confirmé la prise en charge de la commande.', 'text', { key: 'systemMessages.orderConfirmedByProvider' })
  const locationRequest = await addSystemMessage(
    conversation.id,
    "Le chercheur peut partager sa localisation avec le prestataire pour faciliter l'intervention.",
    'location_request',
    { key: 'systemMessages.locationRequestPrompt' },
  )

  res.status(201).json({ confirmation, locationRequest })
}

/** POST /api/conversations/:id/share-location — le chercheur partage un point de localisation. */
export async function shareLocation(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req, 'client')

  const pending = await findLatestUnresolvedMessage(conversation.id, 'location_request')
  if (!pending) conflict('Aucune demande de localisation en attente pour cette conversation.')

  const { lat, lng } = req.body as z.infer<typeof shareLocationSchema>

  await resolveMessage(conversation.id, pending.id)
  const message = await addMessage(conversation.id, user.id, user.role as 'client' | 'prestataire', '📍 Localisation partagée avec le prestataire.', {
    kind: 'location_shared',
    location: { lat, lng },
    translation: { key: 'systemMessages.locationShared' },
  })

  res.status(201).json({ message })
}

/** POST /api/conversations/:id/deliver (#195) — le prestataire marque la prestation terminée. */
export async function markDelivered(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'provider')

  const result = await markEscrowOrderDelivered(conversation.id)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à livrer pour cette conversation.')
    if (result.error === 'check_in_out_required') {
      conflict('Un check-in et un check-out sont requis avant de marquer la prestation comme terminée.')
    }
    conflict('Cette commande ne peut pas être marquée comme terminée dans son état actuel.')
  }

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/receive (#195) — le chercheur confirme, libère les fonds. */
export async function confirmReceipt(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'client')

  const result = await confirmEscrowOrderReceipt(conversation.id)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à confirmer pour cette conversation.')
    conflict("Cette commande ne peut pas être confirmée dans son état actuel (livraison attendue d'abord).")
  }

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/cancel (#196) — le prestataire annule, remboursement intégral. */
export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'provider')
  const body = req.body as z.infer<typeof cancelEscrowSchema>

  const result = await cancelEscrowOrder(conversation.id, body.reason)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à annuler pour cette conversation.')
    if (result.error === 'reason_required') badRequest("Le motif d'annulation est obligatoire.")
    conflict('Cette commande ne peut plus être annulée (déjà libérée ou non payée).')
  }

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/client-cancel (#275) — le chercheur annule après paiement. */
export async function clientCancelOrder(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'client')
  const body = req.body as z.infer<typeof cancelEscrowSchema>

  const result = await cancelEscrowOrderByClient(conversation.id, body.reason)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à annuler pour cette conversation.')
    if (result.error === 'reason_required') badRequest("Le motif d'annulation est obligatoire.")
    conflict('Cette commande ne peut plus être annulée à ce stade (déjà livrée, non payée, ou déjà clôturée).')
  }

  res.json({ order: result.order, providerCompensation: result.providerCompensation })
}

/** POST /api/conversations/:id/dispute (#197) — le chercheur ouvre un litige. */
export async function openDispute(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'client')
  const body = req.body as z.infer<typeof disputeEscrowSchema>

  const result = await openEscrowDispute(conversation.id, body.reason, body.evidence)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à contester pour cette conversation.')
    if (result.error === 'reason_required') badRequest('Le motif du litige est obligatoire.')
    conflict("Cette commande ne peut pas être contestée dans son état actuel (livraison attendue d'abord).")
  }

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/respond-dispute (#274) — le prestataire répond au litige. */
export async function respondDispute(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'provider')
  const body = req.body as z.infer<typeof respondDisputeSchema>

  const result = await respondToDispute(conversation.id, body.response)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en litige pour cette conversation.')
    if (result.error === 'response_required') badRequest('Votre réponse au litige est obligatoire.')
    conflict("Cette commande n'est pas (ou plus) en litige.")
  }

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/confirm-dispute-resolution (#274) — le chercheur tranche. */
export async function resolveDispute(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'client')
  const body = req.body as z.infer<typeof confirmDisputeResolutionSchema>

  const result = await confirmDisputeResolution(conversation.id, body.confirmed)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en litige pour cette conversation.')
    if (result.error === 'awaiting_provider_response') badRequest("Le prestataire n'a pas encore répondu au litige.")
    conflict("Cette commande n'est pas (ou plus) en litige.")
  }

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/check-in (#268) — le prestataire enregistre son arrivée. */
export async function checkIn(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'provider')
  const body = req.body as z.infer<typeof checkInOutSchema>
  const location = body.lat !== undefined && body.lng !== undefined ? { lat: body.lat, lng: body.lng } : null

  const result = await recordEscrowOrderCheckIn(conversation.id, location)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en cours pour cette conversation.')
    if (result.error === 'already_checked_in') conflict('Un check-in a déjà été enregistré pour cette prestation.')
    conflict("Le check-in n'est possible que pour une commande payée et non encore livrée.")
  }

  res.json({ order: result.order })
}

/** POST /api/conversations/:id/check-out (#268) — le prestataire enregistre son départ. */
export async function checkOut(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'provider')
  const body = req.body as z.infer<typeof checkInOutSchema>
  const location = body.lat !== undefined && body.lng !== undefined ? { lat: body.lat, lng: body.lng } : null

  const result = await recordEscrowOrderCheckOut(conversation.id, location)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en cours pour cette conversation.')
    if (result.error === 'check_in_required') badRequest('Un check-in doit être enregistré avant le check-out.')
    if (result.error === 'already_checked_out') conflict('Un check-out a déjà été enregistré pour cette prestation.')
    conflict("Le check-out n'est possible que pour une commande payée et non encore livrée.")
  }

  res.json({ order: result.order })
}

/** Formate un créneau proposé (#270). Iso Nitro. */
function formatProposedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** POST /api/conversations/:id/propose-reschedule (#270) — le prestataire propose un créneau. */
export async function proposeReschedule(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req, 'provider')

  const order = await getEscrowOrderByConversationId(conversation.id)
  if (!order || (order.status !== 'in_escrow' && order.status !== 'delivered')) {
    conflict('Impossible de proposer un nouveau créneau pour cette commande dans son état actuel.')
  }

  const body = req.body as z.infer<typeof proposeRescheduleSchema>
  const proposedAt = body.proposedAt
  if (proposedAt <= Date.now()) badRequest('La date proposée doit être une date future valide.')

  const note = body.note?.trim()
  const text = note ? `Nouveau créneau proposé : ${formatProposedDate(proposedAt)}. ${note}` : `Nouveau créneau proposé : ${formatProposedDate(proposedAt)}.`

  const message = await addMessage(conversation.id, user.id, user.role as 'client' | 'prestataire', text, {
    kind: 'reschedule_request',
    proposedAt,
    translation: { key: 'systemMessages.rescheduleProposed', params: { date: proposedAt, note: note ?? null } },
  })

  res.status(201).json({ message })
}

/** POST /api/conversations/:id/confirm-reschedule (#270) — le chercheur confirme le créneau. */
export async function confirmReschedule(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'client')

  const pending = await findLatestUnresolvedMessage(conversation.id, 'reschedule_request')
  if (!pending) conflict('Aucune proposition de nouveau créneau en attente pour cette conversation.')

  await resolveMessage(conversation.id, pending.id)
  const confirmation = await addSystemMessage(conversation.id, 'Le chercheur a confirmé le nouveau créneau proposé.', 'text', { key: 'systemMessages.rescheduleConfirmedByClient' })

  res.status(201).json({ confirmation })
}

/** POST /api/conversations/:id/rebook (#266) — reprise rapide d'un prestataire déjà utilisé. */
export async function rebook(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req, 'client')

  const existingOrder = await getEscrowOrderByConversationId(conversation.id)
  if (!existingOrder || (existingOrder.status !== 'released' && existingOrder.status !== 'refunded')) {
    conflict("Une reprise n'est possible qu'après une prestation terminée ou annulée avec ce prestataire.")
  }

  const { description } = req.body as z.infer<typeof rebookSchema>

  const amount = await resolveProviderRate(conversation.providerId)
  if (amount === null) {
    conflict("Ce prestataire n'a pas encore configuré de tarif fixe : demande impossible pour le moment.")
  }

  const message = await addMessage(conversation.id, user.id, user.role as 'client' | 'prestataire', `Nouvelle demande (reprise) : ${description}`, {
    translation: { key: 'systemMessages.rebookRequest', params: { description } },
  })
  const order = await createEscrowOrder({ conversationId: conversation.id, clientId: user.id, providerId: conversation.providerId, amount })

  res.status(201).json({ message, order })
}

/** POST /api/conversations/:id/recurring (#271) — mise en place d'un service récurrent. */
export async function createRecurring(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req, 'client')

  const { frequency } = req.body as z.infer<typeof recurringServiceSchema>

  const amount = await resolveProviderRate(conversation.providerId)
  if (amount === null) {
    conflict("Ce prestataire n'a pas encore configuré de tarif fixe : service récurrent impossible pour le moment.")
  }

  const result = createRecurringService({ conversationId: conversation.id, clientId: user.id, providerId: conversation.providerId, amount, frequency })
  if (!result.ok) conflict('Un service récurrent est déjà actif pour cette conversation.')

  res.status(201).json({ recurringService: result.service })
}

/** DELETE /api/conversations/:id/recurring (#271) — annule le service récurrent. */
export async function cancelRecurring(req: Request, res: Response): Promise<void> {
  const { conversation } = await requireParticipantConversation(req, 'client')

  const result = cancelRecurringService(conversation.id)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucun service récurrent pour cette conversation.')
    conflict('Ce service récurrent est déjà annulé.')
  }

  res.json({ recurringService: result.service })
}
