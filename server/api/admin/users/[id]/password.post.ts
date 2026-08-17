import { prisma } from '~~/server/utils/prisma'

/**
 * Réinitialise le mot de passe d'un compte (`users.password`). Body :
 * `{ password: string }` (min. 8 caractères). Le hash réutilise exactement la
 * primitive du site (server/utils/password.ts) pour que la connexion OTP +
 * mot de passe le vérifie. Toutes les sessions actives sont invalidées : le
 * nouveau mot de passe prend effet et les anciennes connexions sont coupées.
 * Les comptes administrateurs se gèrent dans leur propre module.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'users.password')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if ((target.role as string) === 'admin') {
    badRequest('Le mot de passe d’un administrateur se gère depuis la section Administrateurs.')
  }

  const body = await readBody<{ password?: unknown }>(event)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (password.length < 8) {
    badRequest('Le mot de passe doit contenir au moins 8 caractères.')
  }

  const passwordHash = await hashPassword(password)
  await prisma.user.update({ where: { id }, data: { passwordHash } })
  await prisma.session.deleteMany({ where: { userId: id } })

  return { ok: true }
})
