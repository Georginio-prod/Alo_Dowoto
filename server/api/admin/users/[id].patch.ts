import { prisma } from '~~/server/utils/prisma'

/**
 * Modification d'un compte utilisateur depuis le dashboard (`users.edit`).
 * Champs éditables : prénom, nom, nom d'utilisateur, ville et rôle
 * (client ↔ prestataire uniquement). Le contact (identifiant de connexion,
 * vérifié par OTP côté site) n'est volontairement PAS modifiable ici, et les
 * comptes administrateurs se gèrent dans leur propre module — on refuse donc
 * d'éditer une cible `admin` ou de promouvoir qui que ce soit admin par ce
 * biais (le super-admin racine se crée en ligne de commande).
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'users.edit')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if ((target.role as string) === 'admin') {
    badRequest('Les comptes administrateurs se gèrent depuis la section Administrateurs.')
  }

  const body = await readBody<{
    firstName?: unknown
    lastName?: unknown
    username?: unknown
    location?: unknown
    role?: unknown
  }>(event)

  const data: { firstName?: string; lastName?: string; username?: string; location?: string; role?: 'client' | 'prestataire' } = {}

  if (typeof body?.firstName === 'string') data.firstName = body.firstName.trim()
  if (typeof body?.lastName === 'string') data.lastName = body.lastName.trim()
  if (typeof body?.username === 'string') data.username = body.username.trim()
  if (typeof body?.location === 'string') data.location = body.location.trim()

  if (body?.role !== undefined) {
    if (body.role !== 'client' && body.role !== 'prestataire') {
      badRequest('Rôle invalide (client ou prestataire uniquement).')
    }
    data.role = body.role
  }

  if (Object.keys(data).length === 0) {
    badRequest('Aucune modification fournie.')
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, contact: true, role: true, username: true, firstName: true, lastName: true, location: true },
  })

  return { ok: true, user: updated }
})
