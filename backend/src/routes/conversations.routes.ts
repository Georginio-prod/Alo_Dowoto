import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireClientRole, requireSessionUser } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import {
  cancelEscrowSchema,
  checkInOutSchema,
  confirmDisputeResolutionSchema,
  createConversationSchema,
  disputeEscrowSchema,
  firstContactSchema,
  proposeRescheduleSchema,
  rebookSchema,
  recurringServiceSchema,
  respondDisputeSchema,
  sendMessageSchema,
  shareLocationSchema,
  submitReviewSchema,
} from '../validation/schemas/conversations'
import {
  createConversation,
  firstContact,
  getConversationMessages,
  listConversations,
  postMessage,
  submitConversationReview,
} from '../controllers/conversationController'
import {
  cancelOrder,
  cancelRecurring,
  checkIn,
  checkOut,
  clientCancelOrder,
  confirmOrder,
  confirmReceipt,
  confirmReschedule,
  createRecurring,
  markDelivered,
  openDispute,
  payOrder,
  proposeReschedule,
  rebook,
  resolveDispute,
  respondDispute,
  shareLocation,
} from '../controllers/escrowConversationController'

/**
 * Messagerie et paiement en séquestre (#59/#129/#191…), portés depuis
 * `server/api/conversations/**` (ADR-0017). Montés sous `/api` → chemins iso
 * Nitro. Le rôle est filtré par les gardes ; l'appartenance à la conversation
 * (et le côté client/prestataire) est revérifiée dans chaque handler.
 *
 * @openapi
 * tags:
 *   - name: Conversations
 *     description: Messagerie, paiement en séquestre, litiges, récurrence.
 */
export const conversationsRoutes = Router()

/**
 * @openapi
 * /conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Crée ou retrouve un fil avec un prestataire (client vérifié)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Conversation créée ou retrouvée. }
 *   get:
 *     tags: [Conversations]
 *     summary: Conversations de l'utilisateur connecté
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des conversations. }
 */
conversationsRoutes.post('/conversations', requireClientRole, validateBody(createConversationSchema), asyncHandler(createConversation))
conversationsRoutes.get('/conversations', requireSessionUser, asyncHandler(listConversations))

/**
 * @openapi
 * /conversations/{id}/messages:
 *   get:
 *     tags: [Conversations]
 *     summary: Messages d'un fil (masqués au prestataire tant que non payé)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Fil et commande en séquestre associée. }
 *   post:
 *     tags: [Conversations]
 *     summary: Envoie un message libre (anti-contournement)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Message envoyé. }
 */
conversationsRoutes.get('/conversations/:id/messages', requireSessionUser, asyncHandler(getConversationMessages))
conversationsRoutes.post('/conversations/:id/messages', requireSessionUser, validateBody(sendMessageSchema), asyncHandler(postMessage))

/**
 * @openapi
 * /conversations/{id}/first-contact:
 *   post:
 *     tags: [Conversations]
 *     summary: Formulaire obligatoire de première prise de contact (#129)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Premier contact enregistré, commande créée. }
 */
conversationsRoutes.post('/conversations/:id/first-contact', requireClientRole, validateBody(firstContactSchema), asyncHandler(firstContact))

/**
 * @openapi
 * /conversations/{id}/pay:
 *   post:
 *     tags: [Conversations]
 *     summary: Paiement bloquant en séquestre (#194)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Commande mise en séquestre. }
 */
conversationsRoutes.post('/conversations/:id/pay', requireClientRole, asyncHandler(payOrder))

/**
 * @openapi
 * /conversations/{id}/confirm-order:
 *   post:
 *     tags: [Conversations]
 *     summary: Le prestataire confirme la prise en charge
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Prise en charge confirmée. }
 */
conversationsRoutes.post('/conversations/:id/confirm-order', requireSessionUser, asyncHandler(confirmOrder))

/**
 * @openapi
 * /conversations/{id}/share-location:
 *   post:
 *     tags: [Conversations]
 *     summary: Le chercheur partage un point de localisation
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Localisation partagée. }
 */
conversationsRoutes.post('/conversations/:id/share-location', requireSessionUser, validateBody(shareLocationSchema), asyncHandler(shareLocation))

/**
 * @openapi
 * /conversations/{id}/deliver:
 *   post:
 *     tags: [Conversations]
 *     summary: Le prestataire marque la prestation comme terminée (#195)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Commande livrée. }
 */
conversationsRoutes.post('/conversations/:id/deliver', requireSessionUser, asyncHandler(markDelivered))

/**
 * @openapi
 * /conversations/{id}/receive:
 *   post:
 *     tags: [Conversations]
 *     summary: Le chercheur confirme la réception, libère les fonds (#195)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Fonds libérés. }
 */
conversationsRoutes.post('/conversations/:id/receive', requireClientRole, asyncHandler(confirmReceipt))

/**
 * @openapi
 * /conversations/{id}/cancel:
 *   post:
 *     tags: [Conversations]
 *     summary: Le prestataire annule (remboursement intégral, #196)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Commande remboursée. }
 */
conversationsRoutes.post('/conversations/:id/cancel', requireSessionUser, validateBody(cancelEscrowSchema), asyncHandler(cancelOrder))

/**
 * @openapi
 * /conversations/{id}/client-cancel:
 *   post:
 *     tags: [Conversations]
 *     summary: Le chercheur annule après paiement (grille symétrique, #275)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Commande annulée, compensation éventuelle. }
 */
conversationsRoutes.post('/conversations/:id/client-cancel', requireClientRole, validateBody(cancelEscrowSchema), asyncHandler(clientCancelOrder))

/**
 * @openapi
 * /conversations/{id}/dispute:
 *   post:
 *     tags: [Conversations]
 *     summary: Le chercheur ouvre un litige (#197)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Litige ouvert, fonds gelés. }
 */
conversationsRoutes.post('/conversations/:id/dispute', requireClientRole, validateBody(disputeEscrowSchema), asyncHandler(openDispute))

/**
 * @openapi
 * /conversations/{id}/respond-dispute:
 *   post:
 *     tags: [Conversations]
 *     summary: Le prestataire répond à un litige (#274)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Réponse enregistrée (médiation). }
 */
conversationsRoutes.post('/conversations/:id/respond-dispute', requireSessionUser, validateBody(respondDisputeSchema), asyncHandler(respondDispute))

/**
 * @openapi
 * /conversations/{id}/confirm-dispute-resolution:
 *   post:
 *     tags: [Conversations]
 *     summary: Le chercheur tranche le litige après la réponse du prestataire (#274)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Litige tranché. }
 */
conversationsRoutes.post('/conversations/:id/confirm-dispute-resolution', requireSessionUser, validateBody(confirmDisputeResolutionSchema), asyncHandler(resolveDispute))

/**
 * @openapi
 * /conversations/{id}/check-in:
 *   post:
 *     tags: [Conversations]
 *     summary: Le prestataire enregistre son arrivée (#268)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Check-in enregistré. }
 */
conversationsRoutes.post('/conversations/:id/check-in', requireSessionUser, validateBody(checkInOutSchema), asyncHandler(checkIn))

/**
 * @openapi
 * /conversations/{id}/check-out:
 *   post:
 *     tags: [Conversations]
 *     summary: Le prestataire enregistre son départ (#268)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Check-out enregistré. }
 */
conversationsRoutes.post('/conversations/:id/check-out', requireSessionUser, validateBody(checkInOutSchema), asyncHandler(checkOut))

/**
 * @openapi
 * /conversations/{id}/propose-reschedule:
 *   post:
 *     tags: [Conversations]
 *     summary: Le prestataire propose un nouveau créneau (#270)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Créneau proposé. }
 */
conversationsRoutes.post('/conversations/:id/propose-reschedule', requireSessionUser, validateBody(proposeRescheduleSchema), asyncHandler(proposeReschedule))

/**
 * @openapi
 * /conversations/{id}/confirm-reschedule:
 *   post:
 *     tags: [Conversations]
 *     summary: Le chercheur confirme le nouveau créneau (#270)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Créneau confirmé. }
 */
conversationsRoutes.post('/conversations/:id/confirm-reschedule', requireClientRole, asyncHandler(confirmReschedule))

/**
 * @openapi
 * /conversations/{id}/rebook:
 *   post:
 *     tags: [Conversations]
 *     summary: Reprise rapide d'un prestataire déjà utilisé (#266)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Nouvelle commande créée. }
 */
conversationsRoutes.post('/conversations/:id/rebook', requireClientRole, validateBody(rebookSchema), asyncHandler(rebook))

/**
 * @openapi
 * /conversations/{id}/recurring:
 *   post:
 *     tags: [Conversations]
 *     summary: Met en place un service récurrent (#271)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Service récurrent créé. }
 *   delete:
 *     tags: [Conversations]
 *     summary: Annule le service récurrent (#271)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Service récurrent annulé. }
 */
conversationsRoutes.post('/conversations/:id/recurring', requireClientRole, validateBody(recurringServiceSchema), asyncHandler(createRecurring))
conversationsRoutes.delete('/conversations/:id/recurring', requireClientRole, asyncHandler(cancelRecurring))

/**
 * @openapi
 * /conversations/{id}/review:
 *   post:
 *     tags: [Conversations]
 *     summary: Notation mutuelle de fin de collaboration (#61, avis vérifié)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       201: { description: Avis enregistré. }
 */
conversationsRoutes.post('/conversations/:id/review', requireSessionUser, validateBody(submitReviewSchema), asyncHandler(submitConversationReview))
