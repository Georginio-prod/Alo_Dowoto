import { prisma } from '~~/server/utils/prisma'
import type { EscrowOrderStatus } from '~~/server/utils/escrowOrderStore'
import { getMessages } from '~~/server/utils/conversationStore'
import { getUserById } from '~~/server/utils/userStore'

/**
 * Vue admin des missions (#dashboard-admin, module 4) : une « mission » est
 * une commande en séquestre (EscrowOrder, Prisma réel), dont le cycle de vie
 * (awaiting_payment → in_escrow → delivered → released, ou refunded/disputed)
 * couvre déjà « avance payée » → « en cours » → « terminée » → « validée » /
 * « annulée » / « en litige ». Le seul palier antérieur (« brouillon » —
 * fiche préalable pas encore transformée en commande) vient de
 * server/utils/requestStore.ts (réel mais volatile, voir docs/admin-dashboard.md).
 */

export interface AdminMissionSummary {
  id: string
  status: EscrowOrderStatus
  amount: number
  clientName: string
  providerName: string
  createdAt: number
}

export interface AdminMissionFilters {
  status?: EscrowOrderStatus
  clientId?: string
  providerId?: string
}

export interface AdminMissionListResult {
  missions: AdminMissionSummary[]
  total: number
}

async function nameFor(userId: string): Promise<string> {
  const user = await getUserById(userId)
  if (!user) return userId.slice(0, 8)
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || userId.slice(0, 8)
}

export async function listAdminMissions(filters: AdminMissionFilters, page: number, pageSize: number): Promise<AdminMissionListResult> {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.providerId ? { providerId: filters.providerId } : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.escrowOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.escrowOrder.count({ where }),
  ])

  const missions = await Promise.all(rows.map(async (row) => ({
    id: row.id,
    status: row.status as EscrowOrderStatus,
    amount: row.amount,
    clientName: await nameFor(row.clientId),
    providerName: await nameFor(row.providerId),
    createdAt: row.createdAt.getTime(),
  })))

  return { missions, total }
}

export interface AdminMissionDetail {
  id: string
  status: EscrowOrderStatus
  amount: number
  clientId: string
  clientName: string
  providerId: string
  providerName: string
  createdAt: number
  paidAt: number | null
  deliveredAt: number | null
  releasedAt: number | null
  cancelledAt: number | null
  cancelReason: string | null
  disputedAt: number | null
  disputeReason: string | null
  disputeEvidence: string | null
  disputeResponse: string | null
  checkInAt: number | null
  checkOutAt: number | null
  messages: { id: string, senderRole: string, body: string, createdAt: number }[]
  notes: { id: string, authorLabel: string, body: string, createdAt: number }[]
}

export async function getAdminMissionDetail(id: string): Promise<AdminMissionDetail | null> {
  const row = await prisma.escrowOrder.findUnique({ where: { id } })
  if (!row) return null

  const [messages, notes, clientName, providerName] = await Promise.all([
    getMessages(row.conversationId),
    prisma.adminNote.findMany({ where: { targetType: 'mission', targetId: id }, orderBy: { createdAt: 'desc' } }),
    nameFor(row.clientId),
    nameFor(row.providerId),
  ])

  return {
    id: row.id,
    status: row.status as EscrowOrderStatus,
    amount: row.amount,
    clientId: row.clientId,
    clientName,
    providerId: row.providerId,
    providerName,
    createdAt: row.createdAt.getTime(),
    paidAt: row.paidAt?.getTime() ?? null,
    deliveredAt: row.deliveredAt?.getTime() ?? null,
    releasedAt: row.releasedAt?.getTime() ?? null,
    cancelledAt: row.cancelledAt?.getTime() ?? null,
    cancelReason: row.cancelReason,
    disputedAt: row.disputedAt?.getTime() ?? null,
    disputeReason: row.disputeReason,
    disputeEvidence: row.disputeEvidence,
    disputeResponse: row.disputeResponse,
    checkInAt: row.checkInAt?.getTime() ?? null,
    checkOutAt: row.checkOutAt?.getTime() ?? null,
    messages: messages.map((m) => ({ id: m.id, senderRole: m.senderRole, body: m.body, createdAt: m.createdAt })),
    notes: notes.map((n) => ({ id: n.id, authorLabel: n.authorLabel, body: n.body, createdAt: n.createdAt.getTime() })),
  }
}
