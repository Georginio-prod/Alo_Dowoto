import type { Conversation as PrismaConversation, Message as PrismaMessage, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des conversations et messages (`prisma.conversation`,
 * `prisma.message`, `prisma.conversationRead`). Porté iso depuis
 * `server/utils/conversationStore.ts` (ADR-0016), déjà persisté en base
 * (ADR-0013). Client Prisma injecté. La logique d'enrichissement (résumé,
 * nom de l'autre partie, avis) reste dans `conversationService`.
 */

export interface Conversation {
  id: string
  clientId: string
  providerId: string
  createdAt: number
  /** Formulaire obligatoire de première prise de contact déjà soumis (#129) ? */
  firstContactDone: boolean
  /** Coordonnées brutes du chercheur transmises au premier contact (#129), jamais exposées avant validation (#264). */
  clientContact: string | null
}

/** Types de message d'un fil (voir `conversationStore`). */
export type MessageKind = 'text' | 'order_confirmation' | 'location_request' | 'location_shared' | 'reschedule_request'
export type MessageSenderRole = 'client' | 'prestataire' | 'system'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderRole: MessageSenderRole
  body: string
  kind: MessageKind
  location: { lat: number; lng: number } | null
  proposedAt: number | null
  resolvedAt: number | null
  createdAt: number
  translationKey: string | null
  translationParams: Record<string, unknown> | null
}

/** Ce qu'un appelant fournit pour qu'un message soit traduit à l'affichage plutôt que figé en français. */
export interface MessageTranslation {
  key: string
  params?: Record<string, unknown>
}

export interface AddMessageOptions {
  kind?: MessageKind
  location?: { lat: number; lng: number }
  proposedAt?: number
  translation?: MessageTranslation
}

/** Jamais lu = tout est non lu (voir `unreadCountFor`). */
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

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
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
    // Un JSON malformé ne doit jamais faire planter l'affichage : repli silencieux sur `body`.
    translationParams: row.translationParams ? safeJsonParse(row.translationParams) : null,
  }
}

export interface ConversationRepository {
  findOrCreate(clientId: string, providerId: string): Promise<Conversation>
  findById(id: string): Promise<Conversation | null>
  markFirstContactDone(conversationId: string): Promise<void>
  setClientContact(conversationId: string, contact: string): Promise<void>
  getClientContact(conversationId: string): Promise<string | null>
  listForUser(userId: string): Promise<Conversation[]>
  getMessages(conversationId: string): Promise<Message[]>
  lastMessageOf(conversationId: string): Promise<Message | null>
  markRead(conversationId: string, userId: string): Promise<void>
  unreadCountFor(conversationId: string, viewerId: string): Promise<number>
  addMessage(conversationId: string, senderId: string, senderRole: MessageSenderRole, body: string, options?: AddMessageOptions): Promise<Message>
  findLatestUnresolvedMessage(conversationId: string, kind: MessageKind): Promise<Message | null>
  resolveMessage(conversationId: string, messageId: string): Promise<Message | null>
}

export function createConversationRepository(db: PrismaClient): ConversationRepository {
  return {
    async findOrCreate(clientId, providerId) {
      const row = await db.conversation.upsert({
        where: { clientId_providerId: { clientId, providerId } },
        update: {},
        create: { clientId, providerId },
      })
      return toConversation(row)
    },
    async findById(id) {
      const row = await db.conversation.findUnique({ where: { id } })
      return row ? toConversation(row) : null
    },
    async markFirstContactDone(conversationId) {
      await db.conversation.updateMany({ where: { id: conversationId }, data: { firstContactDone: true } })
    },
    async setClientContact(conversationId, contact) {
      await db.conversation.updateMany({ where: { id: conversationId }, data: { clientContact: contact } })
    },
    async getClientContact(conversationId) {
      const row = await db.conversation.findUnique({ where: { id: conversationId }, select: { clientContact: true } })
      return row?.clientContact ?? null
    },
    async listForUser(userId) {
      const rows = await db.conversation.findMany({
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
    },
    async getMessages(conversationId) {
      const rows = await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } })
      return rows.map(toMessage)
    },
    async lastMessageOf(conversationId) {
      const row = await db.message.findFirst({ where: { conversationId }, orderBy: { createdAt: 'desc' } })
      return row ? toMessage(row) : null
    },
    async markRead(conversationId, userId) {
      await db.conversationRead.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        update: { lastReadAt: new Date() },
        create: { conversationId, userId, lastReadAt: new Date() },
      })
    },
    async unreadCountFor(conversationId, viewerId) {
      const read = await db.conversationRead.findUnique({ where: { conversationId_userId: { conversationId, userId: viewerId } } })
      return db.message.count({
        where: { conversationId, senderId: { not: viewerId }, createdAt: { gt: read?.lastReadAt ?? EPOCH } },
      })
    },
    async addMessage(conversationId, senderId, senderRole, body, options) {
      const row = await db.message.create({
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
    },
    async findLatestUnresolvedMessage(conversationId, kind) {
      const row = await db.message.findFirst({ where: { conversationId, kind, resolvedAt: null }, orderBy: { createdAt: 'desc' } })
      return row ? toMessage(row) : null
    },
    async resolveMessage(conversationId, messageId) {
      const existing = await db.message.findUnique({ where: { id: messageId } })
      if (!existing || existing.conversationId !== conversationId) return null
      const row = await db.message.update({ where: { id: messageId }, data: { resolvedAt: new Date() } })
      return toMessage(row)
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const conversationRepository = createConversationRepository(prisma)
