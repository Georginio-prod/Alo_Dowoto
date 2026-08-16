import { prisma } from '~~/server/utils/prisma'

/**
 * Marque un paiement EN ATTENTE comme échoué (`payments.manage`) — nettoyage
 * d'un paiement Mobile Money abandonné. Action sûre : aucun mouvement d'argent,
 * aucun effet de bord sur l'abonnement. On ne « confirme » jamais un paiement
 * à la main (l'activation d'abonnement passe par le webhook Mobile Money, ou
 * par « Gérer l'abonnement » sur la fiche du prestataire). Réutilise la
 * primitive atomique resolvePayment (idempotente si déjà résolu).
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'payments.manage')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant de paiement manquant.')

  const existing = await prisma.payment.findUnique({ where: { id }, select: { status: true } })
  if (!existing) notFound('Paiement introuvable.')
  if (existing.status !== 'pending') {
    badRequest('Seul un paiement en attente peut être marqué comme échoué.')
  }

  const payment = await resolvePayment(id, 'failed', 'admin-manuel')
  return { ok: true, status: payment?.status ?? 'failed' }
})
