import { prisma } from '~~/server/utils/prisma'

/**
 * Suppression définitive d'un compte utilisateur depuis le dashboard. Réservé
 * aux admins possédant `users.delete`. Garde-fous : on ne peut pas supprimer
 * son propre compte, ni le dernier administrateur restant.
 *
 * La suppression est transactionnelle et retire d'abord les enregistrements
 * qui référencent l'utilisateur par clé étrangère bloquante (avis rédigés,
 * profil prestataire et ses avis, paiements, abonnements) avant le compte
 * lui-même. Les sessions et parrainages disparaissent en cascade (onDelete:
 * Cascade). Les commandes de séquestre, conversations et réclamations
 * référencent l'utilisateur par identifiant simple (sans clé étrangère) : la
 * suppression ne les touche pas et n'est pas bloquée par elles.
 */
export default defineEventHandler(async (event) => {
  const me = await requireAdminPermission(event, 'users.delete')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, firstName: true, lastName: true, contact: true },
  })
  if (!target) notFound('Utilisateur introuvable.')

  if (target.id === me.id) {
    badRequest('Vous ne pouvez pas supprimer votre propre compte.')
  }

  if ((target.role as string) === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } })
    if (adminCount <= 1) {
      badRequest('Impossible de supprimer le dernier administrateur.')
    }
  }

  await prisma.$transaction(async (tx) => {
    // Avis rédigés par l'utilisateur, et avis reçus (le noté est identifié par
    // son id utilisateur — `targetId`, cf. server/utils/reviewStore.ts).
    await tx.review.deleteMany({ where: { authorId: id } })
    await tx.review.deleteMany({ where: { targetId: id } })

    // Profil prestataire, le cas échéant.
    await tx.providerProfile.deleteMany({ where: { userId: id } })

    // Paiements puis abonnements (les paiements référencent l'abonnement).
    await tx.payment.deleteMany({ where: { userId: id } })
    await tx.subscription.deleteMany({ where: { userId: id } })

    // Compte : sessions et parrainages partent en cascade.
    await tx.user.delete({ where: { id } })
  })

  return {
    ok: true,
    deleted: {
      id: target.id,
      name: `${target.firstName} ${target.lastName}`.trim() || target.contact,
    },
  }
})
