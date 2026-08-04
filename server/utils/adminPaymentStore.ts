import { prisma } from '~~/server/utils/prisma'
import { TACIT_VALIDATION_DELAY_MS } from '~~/server/utils/escrowOrderStore'

/**
 * Vue admin unifiée des mouvements financiers (#dashboard-admin, module 5) —
 * fusionne trois tables Prisma réelles : `Payment` (abonnements encaissés),
 * `WalletRecharge` (recharges chercheur) et `WalletMovement` (séquestre :
 * avances encaissées, libérations, remboursements, commissions).
 */

export type AdminMovementKind = 'subscription_payment' | 'wallet_recharge' | 'escrow_debit' | 'escrow_release' | 'escrow_refund' | 'commission' | 'other'

export interface AdminMovementRow {
  id: string
  kind: AdminMovementKind
  amount: number
  status: 'pending' | 'confirmed' | 'failed' | 'completed'
  method: string | null
  userId: string
  createdAt: number
}

export interface AdminMovementFilters {
  kind?: AdminMovementKind
  status?: string
  method?: string
  from?: number
  to?: number
}

function matches(row: AdminMovementRow, filters: AdminMovementFilters): boolean {
  if (filters.kind && row.kind !== filters.kind) return false
  if (filters.status && row.status !== filters.status) return false
  if (filters.method && row.method !== filters.method) return false
  if (filters.from && row.createdAt < filters.from) return false
  if (filters.to && row.createdAt > filters.to) return false
  return true
}

const WALLET_KIND_MAP: Partial<Record<string, AdminMovementKind>> = {
  escrow_debit: 'escrow_debit',
  escrow_release: 'escrow_release',
  escrow_refund: 'escrow_refund',
  commission: 'commission',
}

export interface AdminMovementListResult {
  rows: AdminMovementRow[]
  total: number
}

export async function listAdminMovements(filters: AdminMovementFilters, page: number, pageSize: number): Promise<AdminMovementListResult> {
  const [payments, recharges, walletMovements] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.walletRecharge.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.walletMovement.findMany({ where: { type: { in: ['escrow_debit', 'escrow_release', 'escrow_refund', 'commission'] } }, orderBy: { createdAt: 'desc' }, take: 500 }),
  ])

  const rows: AdminMovementRow[] = [
    ...payments.map((p): AdminMovementRow => ({ id: p.id, kind: 'subscription_payment', amount: p.amount, status: p.status, method: p.provider, userId: p.userId, createdAt: p.createdAt.getTime() })),
    ...recharges.map((r): AdminMovementRow => ({ id: r.id, kind: 'wallet_recharge', amount: r.amount, status: r.status, method: r.provider, userId: r.userId, createdAt: r.createdAt.getTime() })),
    // `id` reprend `reference` (= id de l'EscrowOrder pour ces types, voir
    // server/utils/walletStore.ts) plutôt que l'id du mouvement lui-même : les
    // actions admin (libérer/rembourser) ciblent la commande, pas la ligne de
    // journal append-only.
    ...walletMovements.map((m): AdminMovementRow => ({ id: m.reference, kind: WALLET_KIND_MAP[m.type] ?? 'other', amount: m.amount, status: 'completed', method: null, userId: m.walletUserId, createdAt: m.createdAt.getTime() })),
  ].sort((a, b) => b.createdAt - a.createdAt)

  const filtered = rows.filter((row) => matches(row, filters))
  const total = filtered.length
  const start = (page - 1) * pageSize
  return { rows: filtered.slice(start, start + pageSize), total }
}

export interface BlockedPaymentAlert {
  orderId: string
  amount: number
  status: string
  since: number
}

/** Commandes en séquestre bloquées au-delà du délai normal de validation (#dashboard-admin, module 5). */
export async function listBlockedPayments(): Promise<BlockedPaymentAlert[]> {
  const threshold = new Date(Date.now() - TACIT_VALIDATION_DELAY_MS * 2)
  const rows = await prisma.escrowOrder.findMany({
    where: { status: { in: ['in_escrow', 'delivered'] }, createdAt: { lt: threshold } },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((row) => ({ orderId: row.id, amount: row.amount, status: row.status, since: row.createdAt.getTime() }))
}

export async function exportMovementsCsv(filters: AdminMovementFilters): Promise<string> {
  const { rows } = await listAdminMovements(filters, 1, 10000)
  const header = 'id,kind,amount,status,method,userId,createdAt'
  const lines = rows.map((r) => [r.id, r.kind, r.amount, r.status, r.method ?? '', r.userId, new Date(r.createdAt).toISOString()].join(','))
  return [header, ...lines].join('\n')
}
