import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest, conflict, forbidden } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { maskContact } from '../utils/contactMask'
import { detectContournementAttempt } from '../utils/contournementDetector'
import { getSectorFieldsFr } from '../data/firstContactSectorFields'
import { verificationService } from '../services/verificationService'
import { userRepository } from '../repositories/userRepository'
import { getProviderById, resolveProviderRate } from '../services/providerDirectoryService'
import { contournementAttemptService } from '../services/contournementAttemptService'
import { evaluateOrderRisk } from '../services/fraudDetectionService'
import { notificationService } from '../services/notificationService'
import { reviewService } from '../services/reviewService'
import {
  addMessage,
  findOrCreateConversation,
  getMessages,
  listConversationsForUser,
  markConversationRead,
  markFirstContactDone,
  setClientContact,
  toConversationSummary,
} from '../services/conversationService'
import {
  countUnpaidOrdersForClient,
  createEscrowOrder,
  getEscrowOrderByConversationId,
  getRecentOrderTimestampsForClient,
  MAX_SIMULTANEOUS_UNPAID_ORDERS,
} from '../services/escrowOrderService'
import { getRecurringServiceByConversationId } from '../services/recurringServiceService'
import { requireParticipantConversation } from './conversationAccess'
import type {
  createConversationSchema,
  firstContactSchema,
  sendMessageSchema,
  submitReviewSchema,
} from '../validation/schemas/conversations'

/**
 * Messagerie (#59/#129/#265/#360) et notation (#61), portés iso depuis
 * `server/api/conversations/**` (ADR-0016). Les actions du séquestre (paiement,
 * livraison, litiges, récurrence) vivent dans `escrowConversationController.ts`
 * pour rester sous la limite de lignes par fichier. Le rôle est filtré par les
 * gardes ; l'appartenance est revérifiée via `requireParticipantConversation`.
 */

/** POST /api/conversations → crée/retrouve un fil (client vérifié, non restreint). */
export async function createConversation(req: Request, res: Response): Promise<void> {
  const user = authUser(req)
  if (!(await verificationService.isVerified(user.id))) {
    forbidden("Vérifiez votre identité avant de contacter un prestataire (carte d'identité + photo passeport).")
  }
  // Anti-désintermédiation (#dashboard-admin) : un compte restreint ne peut plus
  // initier de nouveau fil, mais garde l'accès à ses conversations ouvertes.
  if (user.messagingRestricted) {
    forbidden('Votre messagerie est restreinte. Contactez le support WorkTogo pour plus de détails.')
  }

  const { providerId } = req.body as z.infer<typeof createConversationSchema>

  // Un vrai prestataire non vérifié ne doit pas pouvoir être contacté.
  const providerUser = await userRepository.findById(providerId)
  if (providerUser && !(await verificationService.isVerified(providerUser.id))) {
    forbidden("Ce prestataire n'a pas encore terminé sa vérification d'identité.")
  }

  const conversation = await findOrCreateConversation(user.id, providerId)
  res.json({ conversation: await toConversationSummary(conversation, user.id) })
}

/** GET /api/conversations → conversations de l'utilisateur connecté. */
export async function listConversations(req: Request, res: Response): Promise<void> {
  const user = authUser(req)
  const userConversations = await listConversationsForUser(user.id)
  const conversations = await Promise.all(userConversations.map((conversation) => toConversationSummary(conversation, user.id)))
  res.json({ conversations })
}

/** POST /api/conversations/:id/first-contact (#129) — formulaire obligatoire de première prise de contact. */
export async function firstContact(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req)
  if (conversation.firstContactDone) {
    conflict('La prise de contact a déjà été effectuée pour cette conversation.')
  }

  const { description, contact, urgency, sectorAnswers } = req.body as z.infer<typeof firstContactSchema>

  // Anti-contournement (#265) sur les champs texte libres (hors `contact`, masqué #264).
  const descriptionReason = detectContournementAttempt(description)
  if (descriptionReason) {
    await contournementAttemptService.logAttempt({ conversationId: conversation.id, userId: user.id, reason: descriptionReason, text: description })
    badRequest('Votre description semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.')
  }
  const urgencyReason = urgency ? detectContournementAttempt(urgency) : null
  if (urgencyReason) {
    await contournementAttemptService.logAttempt({ conversationId: conversation.id, userId: user.id, reason: urgencyReason, text: urgency })
    badRequest('Le champ « urgence / délai souhaité » semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.')
  }

  // Fiche différenciée par secteur (#295) : champs revalidés côté serveur.
  const providerSector = (await getProviderById(conversation.providerId))?.sector ?? null
  const sectorFields = getSectorFieldsFr(providerSector)
  const sectorAnswerLines: string[] = []
  const sectorAnswerParams: { key: string; value: string }[] = []
  for (const field of sectorFields) {
    const value = sectorAnswers[field.key]?.trim()
    if (!value) {
      if (field.required) badRequest(`Le champ « ${field.label} » est requis pour ce type de prestation.`)
      continue
    }
    if (field.type === 'text') {
      const reason = detectContournementAttempt(value)
      if (reason) {
        await contournementAttemptService.logAttempt({ conversationId: conversation.id, userId: user.id, reason, text: value })
        badRequest(`Le champ « ${field.label} » semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.`)
      }
    }
    const label = field.type === 'select' ? (field.options?.find((option) => option.value === value)?.label ?? value) : value
    sectorAnswerLines.push(`${field.label} : ${label}`)
    sectorAnswerParams.push({ key: field.key, value })
  }

  // Limite de demandes non payées simultanées (#280).
  if ((await countUnpaidOrdersForClient(user.id)) >= MAX_SIMULTANEOUS_UNPAID_ORDERS) {
    conflict(`Vous avez déjà ${MAX_SIMULTANEOUS_UNPAID_ORDERS} demande(s) en attente de paiement. Réglez-les ou annulez-les avant d'en envoyer une nouvelle.`)
  }

  // Paiement en séquestre obligatoire : tarif fixe requis (#194).
  const amount = await resolveProviderRate(conversation.providerId)
  if (amount === null) {
    conflict("Ce prestataire n'a pas encore configuré de tarif fixe : demande impossible pour le moment.")
  }

  // Règles anti-fraude de base (#277).
  const risk = evaluateOrderRisk({
    clientId: user.id,
    providerId: conversation.providerId,
    amount,
    recentOrderTimestamps: await getRecentOrderTimestampsForClient(user.id),
  })
  if (risk.blocked) conflict(risk.reason)

  // Le contact réel n'est jamais inséré en clair (#264) : version masquée dans le fil.
  const messageLines = [description, ...sectorAnswerLines, `Contact : ${maskContact(contact)}`]
  if (urgency) messageLines.push(`Urgence / délai souhaité : ${urgency}`)

  const message = await addMessage(conversation.id, user.id, user.role as 'client' | 'prestataire', messageLines.join('\n\n'), {
    translation: {
      key: 'systemMessages.firstContact',
      params: {
        description,
        urgency: urgency ?? null,
        contact: maskContact(contact),
        sectorSlug: providerSector,
        sectorAnswers: sectorAnswerParams,
      },
    },
  })
  await markFirstContactDone(conversation.id)
  await setClientContact(conversation.id, contact)
  const order = await createEscrowOrder({ conversationId: conversation.id, clientId: user.id, providerId: conversation.providerId, amount })

  res.status(201).json({ conversation: await toConversationSummary(conversation, user.id), message, order })
}

/** GET /api/conversations/:id/messages — masqué au prestataire tant que la commande n'est pas payée (#194). */
export async function getConversationMessages(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req)

  const order = await getEscrowOrderByConversationId(conversation.id)
  // Déclenche le prélèvement dû d'un service récurrent (#271) — lecture paresseuse, iso Nitro (sans await).
  const recurringService = getRecurringServiceByConversationId(conversation.id)
  const isViewerProvider = user.id === conversation.providerId
  if (isViewerProvider && order && order.status === 'awaiting_payment') {
    res.json({
      conversation: await toConversationSummary(conversation, user.id),
      messages: [],
      escrowOrder: order,
      recurringService,
      awaitingPayment: true,
    })
    return
  }

  await markConversationRead(conversation.id, user.id)

  res.json({
    conversation: await toConversationSummary(conversation, user.id),
    messages: await getMessages(conversation.id),
    escrowOrder: order,
    recurringService,
    awaitingPayment: false,
  })
}

/** POST /api/conversations/:id/messages — message libre, anti-contournement + notification (#265/#360). */
export async function postMessage(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req)
  // Le client doit d'abord compléter le premier contact (#129).
  if (user.role === 'client' && user.id === conversation.clientId && !conversation.firstContactDone) {
    conflict("Complétez le formulaire de première prise de contact avant d'envoyer un message.")
  }

  const { body: text } = req.body as z.infer<typeof sendMessageSchema>

  const contournementReason = detectContournementAttempt(text)
  if (contournementReason) {
    await contournementAttemptService.logAttempt({ conversationId: conversation.id, userId: user.id, reason: contournementReason, text })
    badRequest('Ce message semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU. Utilisez la messagerie WorkTogo pour tous vos échanges.')
  }

  const message = await addMessage(conversation.id, user.id, user.role as 'client' | 'prestataire', text)

  // Notifie l'autre partie (#360) — best-effort, ne fait jamais échouer l'envoi.
  const recipientId = user.id === conversation.clientId ? conversation.providerId : conversation.clientId
  const senderName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    (user.role === 'prestataire' ? 'Un prestataire' : 'Un chercheur')
  try {
    await notificationService.notifyNewMessage({ recipientId, conversationId: conversation.id, senderName, messageBody: text })
  } catch (error) {
    console.error(`[notifications] Échec de la notification pour la conversation ${conversation.id} :`, error)
  }

  res.status(201).json({ message })
}

/** POST /api/conversations/:id/review (#61/#285) — notation mutuelle, prestation validée requise. */
export async function submitConversationReview(req: Request, res: Response): Promise<void> {
  const { user, conversation } = await requireParticipantConversation(req)

  const order = await getEscrowOrderByConversationId(conversation.id)
  if (!order || order.status !== 'released') {
    conflict("Un avis ne peut être laissé qu'une fois la prestation validée et payée via WorkTogo.")
  }

  const { rating, comment } = req.body as z.infer<typeof submitReviewSchema>
  const targetId = user.id === conversation.clientId ? conversation.providerId : conversation.clientId

  const review = await reviewService.submitReview(conversation.id, user.id, targetId, rating, comment)
  res.status(201).json({ review })
}
