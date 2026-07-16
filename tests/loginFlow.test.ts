import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '~~/server/utils/password'
import { findOrCreateUser, hasPassword, setPasswordHash, type NewUserProfile } from '~~/server/utils/userStore'

const TEST_PROFILE: NewUserProfile = { username: 'marie90', firstName: 'Marie', lastName: 'Dupont', location: 'Lomé' }

/**
 * Simule la règle métier de POST /api/auth/session pour un compte existant
 * (#126) : une fois le mot de passe défini (#125), il est systématiquement
 * redemandé et vérifié — sans quoi la connexion doit être refusée. On teste
 * ici la logique (userStore + password) plutôt que la route HTTP complète,
 * dans l'esprit des autres tests de ce dossier qui ciblent les stores.
 */
async function attemptLogin(contact: string, password: string): Promise<'ok' | 'missing_password' | 'invalid'> {
  const { user } = await findOrCreateUser(contact, 'client', TEST_PROFILE)
  if (!hasPassword(user)) return 'ok' // compte non finalisé : voir #125

  if (!password) return 'missing_password'
  const valid = await verifyPassword(password, user.passwordHash ?? '')
  return valid ? 'ok' : 'invalid'
}

describe('parcours de connexion — mot de passe obligatoire (#126), persistance #218', () => {
  it('refuse la connexion sans mot de passe pour un compte finalisé', async () => {
    const contact = '+22892220001'
    const { user } = await findOrCreateUser(contact, 'client', TEST_PROFILE)
    await setPasswordHash(user.id, await hashPassword('Sup3r$ecret'))

    expect(await attemptLogin(contact, '')).toBe('missing_password')
  })

  it('refuse un mot de passe incorrect (cas limite)', async () => {
    const contact = '+22892220002'
    const { user } = await findOrCreateUser(contact, 'client', TEST_PROFILE)
    await setPasswordHash(user.id, await hashPassword('Sup3r$ecret'))

    expect(await attemptLogin(contact, 'mauvais-mot-de-passe')).toBe('invalid')
  })

  it('accepte le mot de passe correct', async () => {
    const contact = '+22892220003'
    const { user } = await findOrCreateUser(contact, 'client', TEST_PROFILE)
    await setPasswordHash(user.id, await hashPassword('Sup3r$ecret'))

    expect(await attemptLogin(contact, 'Sup3r$ecret')).toBe('ok')
  })

  it("laisse passer un compte pas encore finalisé (onboarding interrompu, cas limite)", async () => {
    const contact = '+22892220004'
    await findOrCreateUser(contact, 'client', TEST_PROFILE)

    expect(await attemptLogin(contact, '')).toBe('ok')
  })
})
