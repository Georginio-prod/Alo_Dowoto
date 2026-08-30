import {
  conversationRepository,
  type AddMessageOptions,
  type Conversation,
  type Message,
  type MessageKind,
  type MessageSenderRole,
  type MessageTranslation,
} from '../repositories/conversationRepository'
import { userRepository } from '../repositories/userRepository'
import { getProviderById } from './providerDirectoryService'
import { reviewService } from './reviewService'

/**
 * Conversations et messages d'une mise en relation client/prestataire (#59),
 * porté iso depuis `server/utils/conversationStore.ts` (ADR-0016). L'accès
 * Prisma vit dans `conversationRepository` ; ce service ajoute l'enrichissement
 * d'affichage (`toConversationSummary`) et compose l'annuaire, les comptes et
 * les avis. Le contrôle d'accès autorise l'utilisateur dès que son id
 * correspond au `clientId` OU au `providerId` (fonctionne avec l'annuaire de
 * démo comme avec un vrai compte prestataire).
 */

export type { Conversation, Message, MessageKind, MessageSenderRole, MessageTranslation, AddMessageOptions }

/** Émetteur conventionnel des messages automatiques WorkTogo (pas un vrai compte). */
export const WORKTOGO_SYSTEM_SENDER_ID = 'worktogo-system'

export interface ConversationSummary extends Conversation {
  otherPartyName: string
  otherPartySector: string | null
  sectorSlug: string | null
  lastMessage: { body: string; createdAt: number; translationKey: string | null; translationParams: Record<string, unknown> | null } | null
  alreadyReviewed: boolean
  unreadCount: number
}

/** Retrouve la conversation existante entre ce client et ce prestataire, ou la crée (idempotent). */
export function findOrCreateConversation(clientId: string, providerId: string): Promise<Conversation> {
  return conversationRepository.findOrCreate(clientId, providerId)
}

export function getConversationById(id: string): Promise<Conversation | null> {
  return conversationRepository.findById(id)
}

export function markFirstContactDone(conversationId: string): Promise<void> {
  return conversationRepository.markFirstContactDone(conversationId)
}

export function setClientContact(conversationId: string, contact: string): Promise<void> {
  return conversationRepository.setClientContact(conversationId, contact)
}

export function getClientContact(conversationId: string): Promise<string | null> {
  return conversationRepository.getClientContact(conversationId)
}

/** Vérifie que l'utilisateur fait partie de la conversation (client ou prestataire). */
export function isConversationParticipant(conversation: Conversation, userId: string): boolean {
  return conversation.clientId === userId || conversation.providerId === userId
}

export function listConversationsForUser(userId: string): Promise<Conversation[]> {
  return conversationRepository.listForUser(userId)
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return conversationRepository.getMessages(conversationId)
}

export function markConversationRead(conversationId: string, userId: string): Promise<void> {
  return conversationRepository.markRead(conversationId, userId)
}

export function addMessage(
  conversationId: string,
  senderId: string,
  senderRole: MessageSenderRole,
  body: string,
  options?: AddMessageOptions,
): Promise<Message> {
  return conversationRepository.addMessage(conversationId, senderId, senderRole, body, options)
}

/** Poste un message automatique WorkTogo (#hub-messages-automatiques). Iso `addSystemMessage`. */
export function addSystemMessage(
  conversationId: string,
  body: string,
  kind: MessageKind = 'text',
  translation?: MessageTranslation,
): Promise<Message> {
  return conversationRepository.addMessage(conversationId, WORKTOGO_SYSTEM_SENDER_ID, 'system', body, { kind, translation })
}

export function findLatestUnresolvedMessage(conversationId: string, kind: MessageKind): Promise<Message | null> {
  return conversationRepository.findLatestUnresolvedMessage(conversationId, kind)
}

export function resolveMessage(conversationId: string, messageId: string): Promise<Message | null> {
  return conversationRepository.resolveMessage(conversationId, messageId)
}

/**
 * Enrichit une conversation avec les informations d'affichage (nom/secteur de
 * l'autre partie, dernier message, non-lus, déjà noté) du point de vue de
 * `viewerId`. Iso `toConversationSummary`.
 */
export async function toConversationSummary(conversation: Conversation, viewerId: string): Promise<ConversationSummary> {
  const isViewerClient = viewerId === conversation.clientId
  const otherPartyId = isViewerClient ? conversation.providerId : conversation.clientId

  let otherPartyName = 'Utilisateur'
  let otherPartySector: string | null = null
  let sectorSlug: string | null = null

  if (isViewerClient) {
    // L'autre partie est le prestataire : annuaire de démo d'abord, puis vrai compte.
    const directoryEntry = await getProviderById(otherPartyId)
    if (directoryEntry) {
      otherPartyName = directoryEntry.displayName
      otherPartySector = directoryEntry.subSector
      sectorSlug = directoryEntry.sector
    } else {
      const providerUser = await userRepository.findById(otherPartyId)
      if (providerUser) otherPartyName = providerUser.contact
    }
  } else {
    // L'autre partie est le client : seul le compte utilisateur (contact) existe.
    const clientUser = await userRepository.findById(otherPartyId)
    if (clientUser) otherPartyName = clientUser.contact
  }

  const [last, unreadCount, alreadyReviewed] = await Promise.all([
    conversationRepository.lastMessageOf(conversation.id),
    conversationRepository.unreadCountFor(conversation.id, viewerId),
    reviewService.hasReviewed(conversation.id, viewerId),
  ])

  return {
    ...conversation,
    otherPartyName,
    otherPartySector,
    sectorSlug,
    lastMessage: last
      ? { body: last.body, createdAt: last.createdAt, translationKey: last.translationKey, translationParams: last.translationParams }
      : null,
    alreadyReviewed,
    unreadCount,
  }
}
