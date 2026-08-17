import { prisma } from '~~/server/utils/prisma'
import { PLATFORM_WALLET_USER_ID, getBalance, listMovements } from '~~/server/utils/walletStore'

/**
 * Portefeuille de la plateforme, en LECTURE SEULE (`wallet.view`). Le solde est
 * toujours recalculé à partir du journal append-only des mouvements (jamais
 * stocké). Aucune écriture ici : fabriquer un mouvement de fonds à la main
 * serait une manipulation financière dangereuse — hors périmètre du dashboard.
 * Affiche le solde plateforme (commissions, flux séquestre), les mouvements
 * récents et les recharges Mobile Money.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'wallet.view')

  const [balance, movements, recharges, rechargeAgg] = await Promise.all([
    getBalance(PLATFORM_WALLET_USER_ID),
    listMovements(PLATFORM_WALLET_USER_ID),
    prisma.walletRecharge.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, userId: true, provider: true, phone: true, amount: true, status: true, createdAt: true, resolvedAt: true },
    }),
    prisma.walletRecharge.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true }, _count: { _all: true } }),
  ])

  return {
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
  }
})
