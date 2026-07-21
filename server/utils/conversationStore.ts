import { randomUUID } from 'node:crypto'
import { getProviderById } from '~~/server/utils/providerDirectory'
import { hasReviewed } from '~~/server/utils/reviewStore'
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
  /** Formulaire obligatoire de première prise de contact déjà soumis (#129) ? */
  firstContactDone: boolean
  /**
   * Coordonnées brutes du chercheur transmises au premier contact (#129).
   * Jamais exposées telles quelles dans un message tant que la prestation
   * n'est pas validée (`released`, voir `escrowOrderStore.ts`) — seule une
   * version masquée (`contactMask.ts`) apparaît dans le fil (#264, anti-fuite).
   */
  clientContact: string | null
}

/**
 * `text` : message classique, écrit par le client ou le prestataire.
 * `order_confirmation` : message automatique WorkTogo demandant au
 * prestataire de confirmer la prise en charge de la commande (envoyé dès le
 * paiement, voir conversations/[id]/pay.post.ts) — actionnable tant que
 * `resolvedAt` est `null`.
 * `location_request` : message automatique WorkTogo demandant au chercheur
 * de valider le partage de sa localisation (envoyé dès que le prestataire
 * confirme, voir conversations/[id]/confirm-order.post.ts) — actionnable
 * tant que `resolvedAt` est `null`.
 * `location_shared` : localisation effectivement partagée par le chercheur
 * (voir conversations/[id]/share-location.post.ts), coordonnées dans
 * `location`.
 * `reschedule_request` : le prestataire propose un nouveau créneau (#270,
 * voir conversations/[id]/propose-reschedule.post.ts) — envoyé par le
 * prestataire lui-même (pas WorkTogo), horodatage proposé dans `proposedAt`,
 * actionnable côté chercheur tant que `resolvedAt` est `null`.
 */
export type MessageKind = 'text' | 'order_confirmation' | 'location_request' | 'location_shared' | 'reschedule_request'

/** `system` : message automatique WorkTogo, pas d'utilisateur réel derrière (voir `WORKTOGO_SYSTEM_SENDER_ID`). */
export type MessageSenderRole = Role | 'system'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderRole: MessageSenderRole
  body: string
  kind: MessageKind
  /** Coordonnées transmises pour un message `location_shared`, sinon `null`. */
  location: { lat: number; lng: number } | null
  /** Horodatage du créneau proposé pour un message `reschedule_request` (#270), sinon `null`. */
  proposedAt: number | null
  /** Horodatage de la réponse à un message actionnable (`order_confirmation`/`location_request`/`reschedule_request`), sinon `null`. */
  resolvedAt: number | null
  createdAt: number
}

/** Émetteur conventionnel des messages automatiques WorkTogo (pas un vrai compte, voir `addSystemMessage`). */
export const WORKTOGO_SYSTEM_SENDER_ID = 'worktogo-system'

export interface ConversationSummary extends Conversation {
  /** Nom affiché de l'autre partie du point de vue de l'utilisateur qui consulte. */
  otherPartyName: string
  /** Secteur/sous-secteur de l'autre partie quand connu (prestataire de l'annuaire de démo). */
  otherPartySector: string | null
  lastMessage: { body: string; createdAt: number } | null
  /** L'utilisateur qui consulte a-t-il déjà noté cette collaboration (#60/#61) ? */
  alreadyReviewed: boolean
  /** Messages de l'autre partie reçus depuis la dernière visite du fil par ce viewer (#225). */
  unreadCount: number
}

const conversations = new Map<string, Conversation>()
const messagesByConversationId = new Map<string, Message[]>()
/** Horodatage de dernière lecture par (conversationId, userId) — en mémoire, comme le reste de ce store (#225). */
const lastReadAtByConversationId = new Map<string, Map<string, number>>()

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

  const conversation: Conversation = {
    id: randomUUID(),
    clientId,
    providerId,
    createdAt: Date.now(),
    firstContactDone: false,
    clientContact: null,
  }
  conversations.set(conversation.id, conversation)
  messagesByConversationId.set(conversation.id, [])
  return conversation
}

export function getConversationById(id: string): Conversation | null {
  return conversations.get(id) ?? null
}

/** Marque le formulaire de première prise de contact comme soumis (#129), une seule fois par conversation. */
export function markFirstContactDone(conversationId: string): void {
  const conversation = conversations.get(conversationId)
  if (conversation) conversation.firstContactDone = true
}

/** Enregistre les coordonnées brutes transmises par le chercheur au premier contact (#129), non exposées avant validation finale (#264). */
export function setClientContact(conversationId: string, contact: string): void {
  const conversation = conversations.get(conversationId)
  if (conversation) conversation.clientContact = contact
}

/** Coordonnées brutes du chercheur pour cette conversation, ou `null` si non encore transmises (#264). */
export function getClientContact(conversationId: string): string | null {
  return conversations.get(conversationId)?.clientContact ?? null
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

/** Marque une conversation comme lue par cet utilisateur à l'instant présent (#225, badges de non-lus). */
export function markConversationRead(conversationId: string, userId: string): void {
  let byUser = lastReadAtByConversationId.get(conversationId)
  if (!byUser) {
    byUser = new Map()
    lastReadAtByConversationId.set(conversationId, byUser)
  }
  byUser.set(userId, Date.now())
}

/** Nombre de messages de l'autre partie reçus depuis la dernière lecture (jamais lue = tout est non lu). */
function unreadCountFor(conversationId: string, viewerId: string): number {
  const lastReadAt = lastReadAtByConversationId.get(conversationId)?.get(viewerId) ?? 0
  const messages = messagesByConversationId.get(conversationId) ?? []
  return messages.filter((message) => message.senderId !== viewerId && message.createdAt > lastReadAt).length
}

export function addMessage(
  conversationId: string,
  senderId: string,
  senderRole: MessageSenderRole,
  body: string,
  options?: { kind?: MessageKind; location?: { lat: number; lng: number }; proposedAt?: number },
): Message {
  const message: Message = {
    id: randomUUID(),
    conversationId,
    senderId,
    senderRole,
    body,
    kind: options?.kind ?? 'text',
    location: options?.location ?? null,
    proposedAt: options?.proposedAt ?? null,
    resolvedAt: null,
    createdAt: Date.now(),
  }
  const list = messagesByConversationId.get(conversationId)
  if (!list) {
    messagesByConversationId.set(conversationId, [message])
  } else {
    list.push(message)
  }
  return message
}

/**
 * Poste un message automatique WorkTogo (#hub-messages-automatiques) —
 * confirmation de prise en charge, demande de partage de localisation…
 * Jamais envoyé par un vrai utilisateur, voir `WORKTOGO_SYSTEM_SENDER_ID`.
 */
export function addSystemMessage(conversationId: string, body: string, kind: MessageKind = 'text'): Message {
  return addMessage(conversationId, WORKTOGO_SYSTEM_SENDER_ID, 'system', body, { kind })
}

/** Dernier message actionnable non résolu d'un type donné, pour valider une action côté client (confirmer/partager) sans état supplémentaire. */
export function findLatestUnresolvedMessage(conversationId: string, kind: MessageKind): Message | null {
  const messages = messagesByConversationId.get(conversationId) ?? []
  const match = messages.findLast((message) => message.kind === kind && message.resolvedAt === null)
  return match ?? null
}

/** Marque un message actionnable comme résolu (une réponse ne peut être apportée qu'une seule fois). */
export function resolveMessage(conversationId: string, messageId: string): Message | null {
  const message = (messagesByConversationId.get(conversationId) ?? []).find((m) => m.id === messageId)
  if (!message) return null
  message.resolvedAt = Date.now()
  return message
}

/**
 * Enrichit une conversation avec les informations d'affichage (nom/secteur
 * de l'autre partie, dernier message) du point de vue de `viewerId` — évite
 * de dupliquer cette résolution dans chaque route (liste et thread, #58).
 */
export async function toConversationSummary(conversation: Conversation, viewerId: string): Promise<ConversationSummary> {
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
      const providerUser = await getUserById(otherPartyId)
      if (providerUser) otherPartyName = providerUser.contact
    }
  } else {
    // L'autre partie est le client : pas de fiche annuaire pour les
    // clients, seul le compte utilisateur (contact) est disponible.
    const clientUser = await getUserById(otherPartyId)
    if (clientUser) otherPartyName = clientUser.contact
  }

  const last = lastMessageOf(conversation.id)

  return {
    ...conversation,
    otherPartyName,
    otherPartySector,
    lastMessage: last ? { body: last.body, createdAt: last.createdAt } : null,
    alreadyReviewed: hasReviewed(conversation.id, viewerId),
    unreadCount: unreadCountFor(conversation.id, viewerId),
  }
}
