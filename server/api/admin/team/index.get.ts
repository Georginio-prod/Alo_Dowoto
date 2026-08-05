import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { prisma } from '~~/server/utils/prisma'
import { toUser } from '~~/server/utils/userStore'

/** Équipe admin (#dashboard-admin, module 12) — comptes ayant le rôle admin, avec leur niveau d'accès. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const rows = await prisma.user.findMany({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' } })
  return { team: rows.map(toUser) }
})
