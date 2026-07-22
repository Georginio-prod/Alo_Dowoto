import type { WalletRecharge as PrismaWalletRecharge } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { creditWallet } from '~~/server/utils/walletStore'

/**
 * Recharges du portefeuille WorkTogo via mobile money (#193), persistées en
 * base (Prisma/SQLite, #342, ADR 0013). Même mécanique que paymentStore : le
 * montant n'est crédité sur le portefeuille (walletStore) qu'une fois la
 * recharge confirmée par l'opérateur — jamais tant qu'elle est `pending`, pour
 * que le journal du portefeuille ne contienne que des mouvements définitifs.
 */

export type WalletRechargeProvider = 'flooz' | 'tmoney'
export type WalletRechargeStatus = 'pending' | 'confirmed' | 'failed'

export interface WalletRecharge {
  id: string
  userId: string
  provider: WalletRechargeProvider
  phone: string
  amount: number
  status: WalletRechargeStatus
  operatorRef: string | null
  createdAt: number
  resolvedAt: number | null
}

function toRecharge(row: PrismaWalletRecharge): WalletRecharge {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider as WalletRechargeProvider,
    phone: row.phone,
    amount: row.amount,
    status: row.status as WalletRechargeStatus,
    operatorRef: row.operatorRef,
    createdAt: row.createdAt.getTime(),
    resolvedAt: row.resolvedAt?.getTime() ?? null,
  }
}

export async function createRecharge(input: {
  userId: string
  provider: WalletRechargeProvider
  phone: string
  amount: number
}): Promise<WalletRecharge> {
  const row = await prisma.walletRecharge.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      phone: input.phone,
      amount: input.amount,
    },
  })
  return toRecharge(row)
}

export async function getRecharge(id: string): Promise<WalletRecharge | null> {
  const row = await prisma.walletRecharge.findUnique({ where: { id } })
  return row ? toRecharge(row) : null
}

/**
 * Applique le résultat d'une confirmation opérateur (webhook réel en prod,
 * simulation en dev — voir server/api/wallet/recharge.post.ts). Idempotent :
 * la résolution est conditionnée par `where: { status: 'pending' }`, donc un
 * double envoi opérateur ne crédite jamais le portefeuille deux fois. Ne
 * crédite le portefeuille que si la confirmation est un succès.
 */
export async function resolveRecharge(id: string, status: 'confirmed' | 'failed', operatorRef?: string): Promise<WalletRecharge | null> {
  const existing = await prisma.walletRecharge.findUnique({ where: { id } })
  if (!existing) return null
  if (existing.status !== 'pending') return toRecharge(existing)

  const result = await prisma.walletRecharge.updateMany({
    where: { id, status: 'pending' },
    data: { status, operatorRef: operatorRef ?? null, resolvedAt: new Date() },
  })
  if (result.count === 0) {
    // Un envoi concurrent a résolu entre-temps : on relit l'état effectif.
    const current = await prisma.walletRecharge.findUnique({ where: { id } })
    return current ? toRecharge(current) : null
  }

  if (status === 'confirmed') {
    await creditWallet({
      walletUserId: existing.userId,
      type: 'recharge',
      amount: existing.amount,
      reference: existing.id,
    })
  }

  const row = await prisma.walletRecharge.findUnique({ where: { id } })
  return row ? toRecharge(row) : null
}
