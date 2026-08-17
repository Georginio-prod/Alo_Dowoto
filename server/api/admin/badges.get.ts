import { prisma } from '~~/server/utils/prisma'

/**
 * Compteurs « à traiter » pour les pastilles d'alerte de la barre latérale du
 * dashboard admin : prestataires non vérifiés, litiges de séquestre en cours,
 * réclamations des 7 derniers jours, abonnements en attente. Lecture seule et
 * volontairement léger (uniquement des count) — appelé à intervalle régulier.
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [unverified, disputed, complaints, pendingSubs] = await Promise.all([
    prisma.providerProfile.count({ where: { verified: false } }),
    prisma.escrowOrder.count({ where: { status: 'disputed' } }),
    prisma.complaint.count({ where: { createdAt: { gte: since7d } } }),
    prisma.subscription.count({ where: { status: 'en_attente' } }),
  ])

  return { unverified, disputed, complaints, pendingSubs }
})
