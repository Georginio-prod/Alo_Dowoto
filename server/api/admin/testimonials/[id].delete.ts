import { prisma } from '~~/server/utils/prisma'

/**
 * Supprime définitivement un témoignage réel (`testimonials.moderate`). Les
 * avis d'exemple (seeds de code) ne sont pas concernés : ils ne sont pas en
 * base. Suppression irréversible — préférer « masquer » pour cacher sans perdre.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'testimonials.moderate')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant de témoignage manquant.')

  const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } })
  if (!existing) notFound('Témoignage introuvable.')

  await prisma.testimonial.delete({ where: { id } })
  return { ok: true }
})
