import { prisma } from '~~/server/utils/prisma'
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  parsePermissions,
} from '~~/server/utils/adminPermissions'

/**
 * Liste des comptes administrateurs pour l'écran de gestion des admins du
 * dashboard. Réservé aux admins possédant `admins.manage`. Renvoie aussi le
 * catalogue des permissions disponibles (clé + libellé) pour l'écran de
 * création. Le `passwordHash` n'est jamais exposé.
 */
export default defineEventHandler(async (event) => {
  const me = await requireAdminPermission(event, 'admins.manage')

  const rows = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      contact: true,
      firstName: true,
      lastName: true,
      username: true,
      createdAt: true,
      adminPermissions: true,
    },
  })

  const items = rows.map((r) => {
    const perms = parsePermissions(r.adminPermissions)
    return {
      id: r.id,
      contact: r.contact,
      firstName: r.firstName,
      lastName: r.lastName,
      username: r.username,
      createdAt: r.createdAt.getTime(),
      isSuperAdmin: perms === null,
      permissions: perms ?? [],
      isSelf: r.id === me.id,
    }
  })

  return {
    items,
    total: items.length,
    catalog: ADMIN_PERMISSIONS.map((key) => ({ key, label: ADMIN_PERMISSION_LABELS[key] })),
  }
})
