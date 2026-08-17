import { prisma } from '~~/server/utils/prisma'
import { serializePermissions } from '~~/server/utils/adminPermissions'

/**
 * Création d'un compte administrateur restreint depuis le dashboard. Réservé
 * aux admins possédant `admins.manage`. Le nouvel admin reçoit uniquement les
 * permissions transmises (tableau de clés) — jamais super-admin par ce biais :
 * le super-admin (permissions NULL, accès total) ne se crée que via
 * scripts/create-admin.mjs. Réutilise exactement la primitive de hachage du
 * site (server/utils/password.ts) pour que /api/admin/login le vérifie.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'admins.manage')

  const body = await readBody<{
    email?: unknown
    password?: unknown
    firstName?: unknown
    lastName?: unknown
    permissions?: unknown
  }>(event)

  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : ''

  if (!email || !password) {
    badRequest('Email et mot de passe requis.')
  }
  if (password.length < 8) {
    badRequest('Le mot de passe doit contenir au moins 8 caractères.')
  }

  const contact = normalizeContact('email', email)
  if (!contact) {
    badRequest('Adresse email invalide.')
  }

  const existing = await prisma.user.findUnique({ where: { contact } })
  if (existing) {
    badRequest('Un compte existe déjà avec cet email.')
  }

  const permissions = serializePermissions(body?.permissions)
  const passwordHash = await hashPassword(password)

  const created = await prisma.user.create({
    data: {
      contact,
      role: 'admin',
      passwordHash,
      adminPermissions: permissions,
      username: (firstName || 'admin').toLowerCase().replace(/\s+/g, '.').slice(0, 24),
      firstName: firstName || 'Admin',
      lastName: lastName || '',
      location: 'Lomé',
    },
    select: { id: true, contact: true, firstName: true, lastName: true, createdAt: true },
  })

  return {
    ok: true,
    admin: {
      id: created.id,
      contact: created.contact,
      firstName: created.firstName,
      lastName: created.lastName,
      createdAt: created.createdAt.getTime(),
      permissions: JSON.parse(permissions) as string[],
    },
  }
})
