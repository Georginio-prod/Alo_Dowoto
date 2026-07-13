import { describe, expect, it } from 'vitest'
import {
  createSession,
  destroySession,
  findOrCreateUser,
  getSessionUser,
  hasPassword,
  setPasswordHash,
  toPublicUser,
} from '~~/server/utils/userStore'

describe('userStore — mot de passe obligatoire (#125, #126)', () => {
  it("un compte fraîchement créé n'a pas de mot de passe", () => {
    const { user, created } = findOrCreateUser('+22891112222', 'client')
    expect(created).toBe(true)
    expect(hasPassword(user)).toBe(false)
  })

  it('le compte est marqué comme finalisé une fois le mot de passe défini (#125)', () => {
    const { user } = findOrCreateUser('+22891112223', 'client')
    setPasswordHash(user.id, 'salt:hash')
    expect(hasPassword(user)).toBe(true)
  })

  it('toPublicUser ne fuite jamais passwordHash au client', () => {
    const { user } = findOrCreateUser('+22891112224', 'client')
    setPasswordHash(user.id, 'salt:hash')
    const publicUser = toPublicUser(user)
    expect(publicUser).not.toHaveProperty('passwordHash')
    expect(publicUser.passwordSet).toBe(true)
  })

  it('une session valide retrouve le bon utilisateur (cas limite : token détruit)', () => {
    const { user } = findOrCreateUser('+22891112225', 'client')
    const token = createSession(user.id)
    expect(getSessionUser(token)?.id).toBe(user.id)

    destroySession(token)
    expect(getSessionUser(token)).toBeNull()
  })
})
