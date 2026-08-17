import { prisma } from '~~/server/utils/prisma'

/**
 * Masque ou réaffiche un témoignage (`testimonials.moderate`). Body :
 * `{ hidden: bool }`. Un avis masqué disparaît de la page d'accueil
 * (server/utils/testimonialStore.ts filtre `hidden: false`) sans être supprimé.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'testimonials.moderate')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant de témoignage manquant.')

  const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } })
  if (!existing) notFound('Témoignage introuvable.')

  const body = await readBody<{ hidden?: unknown }>(event)
  const hidden = body?.hidden === true

  await prisma.testimonial.update({ where: { id }, data: { hidden } })
  return { ok: true, hidden }
})
