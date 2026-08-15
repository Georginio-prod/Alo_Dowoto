import { prisma } from '~~/server/utils/prisma'

/**
 * Action admin : valide (ou retire la validation d')un profil prestataire
 * depuis le dashboard. Bascule le drapeau `verified` de ProviderProfile —
 * c'est le badge « Vérifié » affiché publiquement sur la fiche. `id` est
 * l'identifiant du ProviderProfile (celui listé par /api/admin/providers).
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant prestataire manquant.')

  const body = await readBody<{ verified?: unknown }>(event)
  const verified = body?.verified !== false // défaut : valider

  const existing = await prisma.providerProfile.findUnique({ where: { id } })
  if (!existing) notFound('Profil prestataire introuvable.')

  const updated = await prisma.providerProfile.update({
    where: { id },
    data: { verified },
    select: { id: true, displayName: true, verified: true },
  })

  return { ok: true, provider: updated }
})
