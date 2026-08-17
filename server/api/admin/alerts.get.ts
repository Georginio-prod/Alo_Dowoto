import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { prisma } from '~~/server/utils/prisma'
import { TACIT_VALIDATION_DELAY_MS } from '~~/server/utils/escrowOrderStore'
import { listKycQueue } from '~~/server/utils/kycDecisionStore'

/**
 * Compteurs affichés dans la cloche de l'en-tête admin (#dashboard-admin) :
 * litiges ouverts, KYC en attente, paiements bloqués au-delà du délai normal.
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const [disputesOpen, kycQueue, blockedThreshold] = await Promise.all([
    prisma.escrowOrder.count({ where: { status: 'disputed' } }),
    listKycQueue(),
    Promise.resolve(Date.now() - TACIT_VALIDATION_DELAY_MS * 2),
  ])

  const kycPending = kycQueue.filter((entry) => entry.latestDecision === null).length

  const paymentsBlocked = await prisma.escrowOrder.count({
    where: {
      status: { in: ['in_escrow', 'delivered'] },
      createdAt: { lt: new Date(blockedThreshold) },
    },
  })

  return {
    disputesOpen,
    kycPending,
    paymentsBlocked,
    total: disputesOpen + kycPending + paymentsBlocked,
  }
})
