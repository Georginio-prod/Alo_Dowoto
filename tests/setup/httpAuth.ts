import { randomUUID } from 'node:crypto'
import { createSession, findOrCreateUser, type Role } from '~~/server/utils/userStore'

/**
 * Crée un vrai compte + une vraie session (Prisma, comme en production) et
 * renvoie l'en-tête `Cookie` prêt à l'emploi pour les tests HTTP (#261) —
 * exerce donc `requireSessionUser`/`requireClientRole`/`requireProviderRole`
 * tels qu'ils fonctionnent réellement, pas une simulation.
 */
let counter = 0

export async function createAuthedUser(role: Role) {
  counter += 1
  const contact = `+228${Date.now()}${counter}`
  const { user } = await findOrCreateUser(contact, role, {
    username: `user${randomUUID().slice(0, 8)}`,
    firstName: 'Test',
    lastName: 'User',
    location: 'Lomé',
  })
  const token = await createSession(user.id)
  return { user, cookieHeader: `wt_session=${token}` }
}
