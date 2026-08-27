import type { Conversation as PrismaConversation, Message as PrismaMessage } from '@prisma/client'
import { getProviderById } from '~~/server/utils/providerDirectory'
import { prisma } from '~~/server/utils/prisma'
import { hasReviewed } from '~~/server/utils/reviewStore'
import { getUserById } from '~~/server/utils/userStore'

/**
 * Conversations et messages liés à une mise en relation client/prestataire
 * (#59), persistés en base (Prisma/SQLite, #357, ADR 0013, étape 6 — dernier
 * store du chantier migré en premier car l'escrow s'y appuie). Contrairement
 * à l'ancien store en mémoire, les fils de discussion survivent aux
 * redémarrages du serveur.
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

/**
 * `system` : message automatique WorkTogo, pas d'utilisateur réel derrière
 * (voir `WORKTOGO_SYSTEM_SENDER_ID`). Volontairement `'client' | 'prestataire'`
 * plutôt que `Role` (server/utils/userStore.ts, qui inclut aussi `'admin'`
 * depuis #dashboard-admin) : un admin n'est jamais l'expéditeur d'un message
 * de conversation client/prestataire — ses messages passent par le centre de
 * notifications (server/utils/adminMessaging.ts), un canal distinct.
 */
export type MessageSenderRole = 'client' | 'prestataire' | 'system'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderRole: MessageSenderRole
  /** Rendu tel quel pour un message libre (jamais traduit) ; repli français si `translationKey` ne résout pas côté client. */
  body: string
  kind: MessageKind
  /** Coordonnées transmises pour un message `location_shared`, sinon `null`. */
  location: { lat: number; lng: number } | null
  /** Horodatage du créneau proposé pour un message `reschedule_request` (#270), sinon `null`. */
  proposedAt: number | null
  /** Horodatage de la réponse à un message actionnable (`order_confirmation`/`location_request`/`reschedule_request`), sinon `null`. */
  resolvedAt: number | null
  createdAt: number
  /**
   * Clé i18n (#i18n) pour un message généré par WorkTogo ou par un modèle
   * (confirmation, notification de séquestre, reprogrammation…) — `null` pour
   * un message libre tapé par un utilisateur (`messages.post.ts`), jamais
   * traduit. Voir app/components/MessageBubble.vue pour le rendu par lecteur.
   */
  translationKey: string | null
  /** Paramètres d'interpolation, significatifs seulement si `translationKey` est non nul. */
  translationParams: Record<string, unknown> | null
}

/** Ce qu'un appelant fournit pour qu'un message soit traduit à l'affichage plutôt que figé en français. */
export interface MessageTranslation {
  key: string
  params?: Record<string, unknown>
}

/** Émetteur conventionnel des messages automatiques WorkTogo (pas un vrai compte, voir `addSystemMessage`). */
export const WORKTOGO_SYSTEM_SENDER_ID = 'worktogo-system'

export interface ConversationSummary extends Conversation {
  /** Nom affiché de l'autre partie du point de vue de l'utilisateur qui consulte. */
  otherPartyName: string
  /** Secteur/sous-secteur de l'autre partie quand connu (prestataire de l'annuaire de démo). */
  otherPartySector: string | null
  /**
   * Slug du secteur du prestataire (ex. 'menage', 'btp'), quand connu — pilote
   * les champs additionnels de la fiche de première prise de contact (#295,
   * voir app/data/firstContactSectorFields.ts). `null` côté prestataire (pas
   * de secteur pour un chercheur) ou si le prestataire n'est pas dans
   * l'annuaire de démo.
   */
  sectorSlug: string | null
  lastMessage: { body: string; createdAt: number; translationKey: string | null; translationParams: Record<string, unknown> | null } | null
  /** L'utilisateur qui consulte a-t-il déjà noté cette collaboration (#60/#61) ? */
  alreadyReviewed: boolean
  /** Messages de l'autre partie reçus depuis la dernière visite du fil par ce viewer (#225). */
  unreadCount: number
}

/** Jamais lu = tout est non lu (voir unreadCountFor). */
const EPOCH = new Date(0)

function toConversation(row: PrismaConversation): Conversation {
  return {
    id: row.id,
    clientId: row.clientId,
    providerId: row.providerId,
    createdAt: row.createdAt.getTime(),
    firstContactDone: row.firstContactDone,
    clientContact: row.clientContact,
  }
}

function toMessage(row: PrismaMessage): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderRole: row.senderRole,
    body: row.body,
    kind: row.kind,
    location: row.locationLat !== null && row.locationLng !== null ? { lat: row.locationLat, lng: row.locationLng } : null,
    proposedAt: row.proposedAt?.getTime() ?? null,
    resolvedAt: row.resolvedAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    translationKey: row.translationKey,
    // Un JSON malformé ne doit jamais faire planter l'affichage du fil : on
    // retombe silencieusement sur `body` (voir MessageBubble.vue) — ne
    // devrait jamais arriver en pratique, `translationParams` n'étant écrit
    // que par addMessage/addSystemMessage ci-dessous.
    translationParams: row.translationParams ? safeJsonParse(row.translationParams) : null,
  }
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Retrouve la conversation existante entre ce client et ce prestataire, ou la crée (idempotent). */
export async function findOrCreateConversation(clientId: string, providerId: string): Promise<Conversation> {
  const row = await prisma.conversation.upsert({
    where: { clientId_providerId: { clientId, providerId } },
    update: {},
    create: { clientId, providerId },
  })
  return toConversation(row)
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const row = await prisma.conversation.findUnique({ where: { id } })
  return row ? toConversation(row) : null
}

/** Marque le formulaire de première prise de contact comme soumis (#129), une seule fois par conversation. */
export async function markFirstContactDone(conversationId: string): Promise<void> {
  await prisma.conversation.updateMany({ where: { id: conversationId }, data: { firstContactDone: true } })
}

/** Enregistre les coordonnées brutes transmises par le chercheur au premier contact (#129), non exposées avant validation finale (#264). */
export async function setClientContact(conversationId: string, contact: string): Promise<void> {
  await prisma.conversation.updateMany({ where: { id: conversationId }, data: { clientContact: contact } })
}

/** Coordonnées brutes du chercheur pour cette conversation, ou `null` si non encore transmises (#264). */
export async function getClientContact(conversationId: string): Promise<string | null> {
  const row = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { clientContact: true } })
  return row?.clientContact ?? null
}

/** Vérifie que l'utilisateur fait partie de la conversation (client ou prestataire). */
export function isConversationParticipant(conversation: Conversation, userId: string): boolean {
  return conversation.clientId === userId || conversation.providerId === userId
}

async function lastMessageOf(conversationId: string): Promise<Message | null> {
  const row = await prisma.message.findFirst({ where: { conversationId }, orderBy: { createdAt: 'desc' } })
  return row ? toMessage(row) : null
}

/** Liste les conversations où l'utilisateur est client ou prestataire, triées par dernier message décroissant. */
export async function listConversationsForUser(userId: string): Promise<Conversation[]> {
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ clientId: userId }, { providerId: userId }] },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  return rows
    .sort((a, b) => {
      const aLast = (a.messages[0]?.createdAt ?? a.createdAt).getTime()
      const bLast = (b.messages[0]?.createdAt ?? b.createdAt).getTime()
      return bLast - aLast
    })
    .map(toConversation)
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const rows = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } })
  return rows.map(toMessage)
}

/** Marque une conversation comme lue par cet utilisateur à l'instant présent (#225, badges de non-lus). */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await prisma.conversationRead.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    update: { lastReadAt: new Date() },
    create: { conversationId, userId, lastReadAt: new Date() },
  })
}

/** Nombre de messages de l'autre partie reçus depuis la dernière lecture (jamais lue = tout est non lu). */
async function unreadCountFor(conversationId: string, viewerId: string): Promise<number> {
  const read = await prisma.conversationRead.findUnique({ where: { conversationId_userId: { conversationId, userId: viewerId } } })
  return prisma.message.count({
    where: { conversationId, senderId: { not: viewerId }, createdAt: { gt: read?.lastReadAt ?? EPOCH } },
  })
}

export async function addMessage(
  conversationId: string,
  senderId: string,
  senderRole: MessageSenderRole,
  body: string,
  options?: {
    kind?: MessageKind
    location?: { lat: number; lng: number }
    proposedAt?: number
    /** Rend ce message traduisible à l'affichage (#i18n) — omis pour un message libre tapé par un utilisateur. */
    translation?: MessageTranslation
  },
): Promise<Message> {
  const row = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      senderRole,
      body,
      kind: options?.kind ?? 'text',
      locationLat: options?.location?.lat ?? null,
      locationLng: options?.location?.lng ?? null,
      proposedAt: options?.proposedAt !== undefined ? new Date(options.proposedAt) : null,
      translationKey: options?.translation?.key ?? null,
      translationParams: options?.translation ? JSON.stringify(options.translation.params ?? {}) : null,
    },
  })
  return toMessage(row)
}

/**
 * Poste un message automatique WorkTogo (#hub-messages-automatiques) —
 * confirmation de prise en charge, demande de partage de localisation…
 * Jamais envoyé par un vrai utilisateur, voir `WORKTOGO_SYSTEM_SENDER_ID`.
 *
 * `translation` (#i18n) : `body` reste un repli français (utilisé si la clé
 * ne résout pas côté client, ou par tout code qui lit `body` directement) ;
 * quand fourni, MessageBubble.vue affiche la version traduite selon la
 * langue de chaque lecteur plutôt que ce texte figé.
 */
export async function addSystemMessage(
  conversationId: string,
  body: string,
  kind: MessageKind = 'text',
  translation?: MessageTranslation,
): Promise<Message> {
  return addMessage(conversationId, WORKTOGO_SYSTEM_SENDER_ID, 'system', body, { kind, translation })
}

/** Dernier message actionnable non résolu d'un type donné, pour valider une action côté client (confirmer/partager) sans état supplémentaire. */
export async function findLatestUnresolvedMessage(conversationId: string, kind: MessageKind): Promise<Message | null> {
  const row = await prisma.message.findFirst({
    where: { conversationId, kind, resolvedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  return row ? toMessage(row) : null
}

/** Marque un message actionnable comme résolu (une réponse ne peut être apportée qu'une seule fois). */
export async function resolveMessage(conversationId: string, messageId: string): Promise<Message | null> {
  const existing = await prisma.message.findUnique({ where: { id: messageId } })
  if (!existing || existing.conversationId !== conversationId) return null

  const row = await prisma.message.update({ where: { id: messageId }, data: { resolvedAt: new Date() } })
  return toMessage(row)
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
  let sectorSlug: string | null = null

  if (isViewerClient) {
    // L'autre partie est le prestataire : on tente d'abord l'annuaire de
    // démo (cas courant du prototype), puis un vrai compte utilisateur.
    const directoryEntry = await getProviderById(otherPartyId)
    if (directoryEntry) {
      otherPartyName = directoryEntry.displayName
      otherPartySector = directoryEntry.subSector
      sectorSlug = directoryEntry.sector
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

  const [last, unreadCount] = await Promise.all([
    lastMessageOf(conversation.id),
    unreadCountFor(conversation.id, viewerId),
  ])

  return {
    ...conversation,
    otherPartyName,
    otherPartySector,
    sectorSlug,
    lastMessage: last
      ? { body: last.body, createdAt: last.createdAt, translationKey: last.translationKey, translationParams: last.translationParams }
      : null,
    alreadyReviewed: await hasReviewed(conversation.id, viewerId),
    unreadCount,
  }
}
