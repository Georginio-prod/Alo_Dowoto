import { randomUUID } from 'node:crypto'
import { getProviderById } from '~~/server/utils/providerDirectory'
import { getUserById, type Role } from '~~/server/utils/userStore'

/**
 * Store en mémoire pour les conversations et messages liés à une mise en
 * relation client/prestataire (#59). Suffisant pour ce lot (pas de base de
 * données encore en place, voir #45/#46).
 *
 * Une conversation est identifiée par la paire (clientId, providerId).
 * `clientId` référence toujours un vrai `User` (server/utils/userStore.ts).
 * `providerId`, en revanche, peut référencer :
 *  - soit un id de l'annuaire de démonstration (server/utils/providerDirectory.ts,
 *    ids `p01`..`p14` — ces fiches ne sont pas de vrais comptes, voir sa
 *    documentation) ;
 *  - soit un vrai `userId` prestataire, une fois qu'un compte réel existe.
 *
 * Le contrôle d'accès (voir server/api/conversations/**) ne tranche donc
 * jamais ce point : il autorise l'utilisateur connecté dès que son id
 * correspond au `clientId` OU au `providerId` stocké — ce qui fonctionne
 * aussi bien avec les données de démo côté prestataire qu'avec un vrai
 * compte prestataire connecté, sans migration nécessaire le jour où
 * l'annuaire de démo est remplacé par de vrais profils.
 */

export interface Conversation {
  id: string
  clientId: string
  providerId: string
  createdAt: number
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderRole: Role
  body: string
  createdAt: number
}

export interface ConversationSummary extends Conversation {
  /** Nom affiché de l'autre partie du point de vue de l'utilisateur qui consulte. */
  otherPartyName: string
  /** Secteur/sous-secteur de l'autre partie quand connu (prestataire de l'annuaire de démo). */
  otherPartySector: string | null
  lastMessage: { body: string; createdAt: number } | null
}

const conversations = new Map<string, Conversation>()
const messagesByConversationId = new Map<string, Message[]>()

function findConversation(clientId: string, providerId: string): Conversation | undefined {
  for (const conversation of conversations.values()) {
    if (conversation.clientId === clientId && conversation.providerId === providerId) return conversation
  }
  return undefined
}

/** Retrouve la conversation existante entre ce client et ce prestataire, ou la crée (idempotent). */
export function findOrCreateConversation(clientId: string, providerId: string): Conversation {
  const existing = findConversation(clientId, providerId)
  if (existing) return existing

  const conversation: Conversation = { id: randomUUID(), clientId, providerId, createdAt: Date.now() }
  conversations.set(conversation.id, conversation)
  messagesByConversationId.set(conversation.id, [])
  return conversation
}

export function getConversationById(id: string): Conversation | null {
  return conversations.get(id) ?? null
}

/** Vérifie que l'utilisateur fait partie de la conversation (client ou prestataire). */
export function isConversationParticipant(conversation: Conversation, userId: string): boolean {
  return conversation.clientId === userId || conversation.providerId === userId
}

function lastMessageOf(conversationId: string): Message | undefined {
  const messages = messagesByConversationId.get(conversationId) ?? []
  return messages[messages.length - 1]
}

/** Liste les conversations où l'utilisateur est client ou prestataire, triées par dernier message décroissant. */
export function listConversationsForUser(userId: string): Conversation[] {
  const userConversations = [...conversations.values()].filter(
    (conversation) => conversation.clientId === userId || conversation.providerId === userId,
  )
  return userConversations.sort((a, b) => {
    const aLast = lastMessageOf(a.id)?.createdAt ?? a.createdAt
    const bLast = lastMessageOf(b.id)?.createdAt ?? b.createdAt
    return bLast - aLast
  })
}

export function getMessages(conversationId: string): Message[] {
  return messagesByConversationId.get(conversationId) ?? []
}

export function addMessage(conversationId: string, senderId: string, senderRole: Role, body: string): Message {
  const message: Message = { id: randomUUID(), conversationId, senderId, senderRole, body, createdAt: Date.now() }
  const list = messagesByConversationId.get(conversationId)
  if (!list) {
    messagesByConversationId.set(conversationId, [message])
  } else {
    list.push(message)
  }
  return message
}

/**
 * Enrichit une conversation avec les informations d'affichage (nom/secteur
 * de l'autre partie, dernier message) du point de vue de `viewerId` — évite
 * de dupliquer cette résolution dans chaque route (liste et thread, #58).
 */
export function toConversationSummary(conversation: Conversation, viewerId: string): ConversationSummary {
  const isViewerClient = viewerId === conversation.clientId
  const otherPartyId = isViewerClient ? conversation.providerId : conversation.clientId

  let otherPartyName = 'Utilisateur'
  let otherPartySector: string | null = null

  if (isViewerClient) {
    // L'autre partie est le prestataire : on tente d'abord l'annuaire de
    // démo (cas courant du prototype), puis un vrai compte utilisateur.
    const directoryEntry = getProviderById(otherPartyId)
    if (directoryEntry) {
      otherPartyName = directoryEntry.displayName
      otherPartySector = directoryEntry.subSector
    } else {
      const providerUser = getUserById(otherPartyId)
      if (providerUser) otherPartyName = providerUser.contact
    }
  } else {
    // L'autre partie est le client : pas de fiche annuaire pour les
    // clients, seul le compte utilisateur (contact) est disponible.
    const clientUser = getUserById(otherPartyId)
    if (clientUser) otherPartyName = clientUser.contact
  }

  const last = lastMessageOf(conversation.id)

  return {
    ...conversation,
    otherPartyName,
    otherPartySector,
    lastMessage: last ? { body: last.body, createdAt: last.createdAt } : null,
  }
}
