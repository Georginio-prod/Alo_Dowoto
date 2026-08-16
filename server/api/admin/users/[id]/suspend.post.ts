import { prisma } from '~~/server/utils/prisma'

/**
 * Suspend ou réactive un compte (`users.suspend`). Body : `{ suspended: bool }`.
 *
 * À la suspension, on pose `suspendedAt` ET on supprime toutes les sessions du
 * compte : l'utilisateur est déconnecté immédiatement et ne peut plus se
 * reconnecter (blocage dans server/api/auth/session.post.ts). Garde-fous : on
 * ne suspend ni son propre compte, ni un compte administrateur.
 */
export default defineEventHandler(async (event) => {
  const me = await requireAdminPermission(event, 'users.suspend')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if (target.id === me.id) badRequest('Vous ne pouvez pas suspendre votre propre compte.')
  if ((target.role as string) === 'admin') badRequest('Un compte administrateur ne peut pas être suspendu.')

  const body = await readBody<{ suspended?: unknown }>(event)
  const suspended = body?.suspended === true

  await prisma.user.update({
    where: { id },
    data: { suspendedAt: suspended ? new Date() : null },
  })

  // Suspension = déconnexion immédiate (les sessions actives sont invalidées).
  if (suspended) {
    await prisma.session.deleteMany({ where: { userId: id } })
  }

  return { ok: true, suspended }
})
