import { describe, expect, it } from 'vitest'
import {
  createSession,
  destroySession,
  findOrCreateUser,
  getSessionUser,
  hasPassword,
  setPasswordHash,
  toPublicUser,
  type NewUserProfile,
} from '~~/server/utils/userStore'

const TEST_PROFILE: NewUserProfile = {
  username: 'marie90',
  firstName: 'Marie',
  lastName: 'Dupont',
  location: 'Lomé',
}

describe('userStore — mot de passe obligatoire (#125, #126)', () => {
  it("un compte fraîchement créé n'a pas de mot de passe", () => {
    const { user, created } = findOrCreateUser('+22891112222', 'client', TEST_PROFILE)
    expect(created).toBe(true)
    expect(hasPassword(user)).toBe(false)
  })

  it('le compte est marqué comme finalisé une fois le mot de passe défini (#125)', () => {
    const { user } = findOrCreateUser('+22891112223', 'client', TEST_PROFILE)
    setPasswordHash(user.id, 'salt:hash')
    expect(hasPassword(user)).toBe(true)
  })

  it('toPublicUser ne fuite jamais passwordHash au client', () => {
    const { user } = findOrCreateUser('+22891112224', 'client', TEST_PROFILE)
    setPasswordHash(user.id, 'salt:hash')
    const publicUser = toPublicUser(user)
    expect(publicUser).not.toHaveProperty('passwordHash')
    expect(publicUser.passwordSet).toBe(true)
  })

  it('une session valide retrouve le bon utilisateur (cas limite : token détruit)', () => {
    const { user } = findOrCreateUser('+22891112225', 'client', TEST_PROFILE)
    const token = createSession(user.id)
    expect(getSessionUser(token)?.id).toBe(user.id)

    destroySession(token)
    expect(getSessionUser(token)).toBeNull()
  })
})

describe('userStore — profil obligatoire à la création (nom d\'utilisateur, prénom, nom, localisation)', () => {
  // Le rejet (profil manquant/incomplet) repose sur badRequest() — un helper
  // Nuxt auto-importé côté serveur, indisponible sous Vitest (voir les
  // autres stores de ce dossier, ex. resolveRequiredOnboardingFields de
  // providerStore.ts, qui évite ce piège en retournant un résultat plutôt
  // que de lever l'erreur directement). Couvert par un test end-to-end
  // manuel via curl à la place (voir la description de la PR).

  it('accepte la création avec un profil complet et le restitue sur le user', () => {
    const { user } = findOrCreateUser('+22891112232', 'client', TEST_PROFILE)
    expect(user.username).toBe('marie90')
    expect(user.firstName).toBe('Marie')
    expect(user.lastName).toBe('Dupont')
    expect(user.location).toBe('Lomé')
  })

  it('ne redemande pas le profil pour un contact déjà existant (connexion)', () => {
    findOrCreateUser('+22891112233', 'client', TEST_PROFILE)
    const { user, created } = findOrCreateUser('+22891112233', 'client')
    expect(created).toBe(false)
    expect(user.username).toBe('marie90')
  })
})
