import type { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { PLATFORM_WALLET_USER_ID, walletMovementRepository } from '../repositories/walletMovementRepository'

/**
 * Portefeuille de la plateforme (#admin), en LECTURE SEULE (`wallet.view`).
 * Porté iso depuis `server/api/admin/wallet.get.ts` (ADR-0017). Le solde est
 * toujours recalculé à partir du journal append-only des mouvements (jamais
 * stocké). Aucune écriture ici : fabriquer un mouvement de fonds à la main
 * serait une manipulation financière dangereuse — hors périmètre du dashboard.
 */

/** GET /api/admin/wallet — solde plateforme, mouvements récents et recharges (wallet.view). */
export async function adminWallet(_req: Request, res: Response): Promise<void> {
  const [balance, movements, recharges, rechargeAgg] = await Promise.all([
    walletMovementRepository.getBalance(PLATFORM_WALLET_USER_ID),
    walletMovementRepository.listByUser(PLATFORM_WALLET_USER_ID),
    prisma.walletRecharge.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, userId: true, provider: true, phone: true, amount: true, status: true, createdAt: true, resolvedAt: true },
    }),
    prisma.walletRecharge.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true }, _count: { _all: true } }),
  ])

  res.json({
    platformBalance: balance,
    movements: movements.slice(0, 50),
    recharges: recharges.map((r) => ({
      id: r.id,
      userId: r.userId,
      provider: r.provider,
      phone: r.phone,
      amount: r.amount,
      status: r.status,
      createdAt: r.createdAt.getTime(),
      resolvedAt: r.resolvedAt?.getTime() ?? null,
    })),
    totals: {
      confirmedRecharges: rechargeAgg._count._all,
      confirmedRechargeAmount: rechargeAgg._sum.amount ?? 0,
    },
  })
}
