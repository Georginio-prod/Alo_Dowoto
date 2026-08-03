import { randomUUID } from 'node:crypto'
import { createSession, findOrCreateUser, type Role } from '~~/server/utils/userStore'

/**
 * Crée un vrai compte + une vraie session (Prisma, comme en production) et
 * renvoie l'en-tête `Cookie` prêt à l'emploi pour les tests HTTP (#261) —
 * exerce donc `requireSessionUser`/`requireClientRole`/`requireProviderRole`
 * tels qu'ils fonctionnent réellement, pas une simulation.
 *
 * Le `contact` doit être globalement unique (contrainte d'unicité en base,
 * `test.db` partagé par tous les workers Vitest parallèles). Un compteur
 * incrémental ne suffisait pas : il repart à 0 dans chaque worker, donc deux
 * workers créant un compte à la même milliseconde produisaient le même
 * `+228${Date.now()}${counter}` et se percutaient sur la contrainte (tests
 * flaky, audit M1). `randomUUID()` garantit l'unicité inter-worker, comme déjà
 * fait pour `username`. Le contact n'est pas normalisé côté `findOrCreateUser`
 * (stocké verbatim comme clé unique) : son format importe peu, seule compte
 * son unicité.
 */
export async function createAuthedUser(role: Role) {
  const contact = `+228-test-${randomUUID()}`
  const { user } = await findOrCreateUser(contact, role, {
    username: `user${randomUUID().slice(0, 8)}`,
    firstName: 'Test',
    lastName: 'User',
    location: 'Lomé',
  })
  const token = await createSession(user.id)
  return { user, cookieHeader: `wt_session=${token}` }
}
