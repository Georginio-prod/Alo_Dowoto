import { prisma } from '~~/server/utils/prisma'
import { suspendUser, reactivateUser } from '~~/server/utils/userStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/**
 * Suspend ou réactive un compte — RÉCONCILIE les deux dashboards :
 *  - permission granulaire `users.suspend` + garde-fous (pas soi, pas un admin) [desktop #admin] ;
 *  - `suspendUser`/`reactivateUser` (status + suspendedAt + suspendedReason + suppression des sessions) [web #dashboard-admin] ;
 *  - journal d'audit.
 *
 * Body : `{ suspended?: boolean, reason?: string }`. `suspended` absent ⇒
 * suspension (contrat web) ; fourni ⇒ bascule suspendre/réactiver (contrat desktop).
 */
export default defineEventHandler(async (event) => {
  const me = await requireAdminPermission(event, 'users.suspend')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if (target.id === me.id) badRequest('Vous ne pouvez pas suspendre votre propre compte.')
  if ((target.role as string) === 'admin') badRequest('Un compte administrateur ne peut pas être suspendu.')

  const body = await readBody<{ suspended?: unknown; reason?: unknown }>(event)
  const suspended = body && typeof body === 'object' && 'suspended' in body ? body.suspended === true : true
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  const user = suspended
    ? await suspendUser(id, reason || 'Suspension administrative.')
    : await reactivateUser(id)

  await recordAuditLog({
    actor: me,
    action: suspended ? 'user.suspend' : 'user.reactivate',
    targetType: 'user',
    targetId: id,
    metadata: { reason },
  })

  return { ok: true, suspended, user }
})
