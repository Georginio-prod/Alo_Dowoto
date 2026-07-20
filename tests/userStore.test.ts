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

describe('userStore — mot de passe obligatoire (#125, #126), persistance #218', () => {
  it("un compte fraîchement créé n'a pas de mot de passe", async () => {
    const { user, created } = await findOrCreateUser('+22891112222', 'client', TEST_PROFILE)
    expect(created).toBe(true)
    expect(hasPassword(user)).toBe(false)
  })

  it('le compte est marqué comme finalisé une fois le mot de passe défini (#125)', async () => {
    const { user } = await findOrCreateUser('+22891112223', 'client', TEST_PROFILE)
    await setPasswordHash(user.id, 'salt:hash')
    const { user: reloaded } = await findOrCreateUser('+22891112223', 'client')
    expect(hasPassword(reloaded)).toBe(true)
  })

  it('toPublicUser ne fuite jamais passwordHash au client', async () => {
    const { user } = await findOrCreateUser('+22891112224', 'client', TEST_PROFILE)
    await setPasswordHash(user.id, 'salt:hash')
    const { user: reloaded } = await findOrCreateUser('+22891112224', 'client')
    const publicUser = toPublicUser(reloaded)
    expect(publicUser).not.toHaveProperty('passwordHash')
    expect(publicUser.passwordSet).toBe(true)
  })

  it('une session valide retrouve le bon utilisateur (cas limite : token détruit)', async () => {
    const { user } = await findOrCreateUser('+22891112225', 'client', TEST_PROFILE)
    const token = await createSession(user.id)
    expect((await getSessionUser(token))?.id).toBe(user.id)

    await destroySession(token)
    expect(await getSessionUser(token)).toBeNull()
  })
})

describe('userStore — profil obligatoire à la création (nom d\'utilisateur, prénom, nom, localisation)', () => {
  // Le rejet (profil manquant/incomplet) repose sur badRequest() — un helper
  // Nuxt auto-importé côté serveur, indisponible sous Vitest (voir les
  // autres stores de ce dossier, ex. resolveRequiredOnboardingFields de
  // providerStore.ts, qui évite ce piège en retournant un résultat plutôt
  // que de lever l'erreur directement). Couvert par un test end-to-end
  // manuel via curl à la place (voir la description de la PR).

  it('accepte la création avec un profil complet et le restitue sur le user', async () => {
    const { user } = await findOrCreateUser('+22891112232', 'client', TEST_PROFILE)
    expect(user.username).toBe('marie90')
    expect(user.firstName).toBe('Marie')
    expect(user.lastName).toBe('Dupont')
    expect(user.location).toBe('Lomé')
  })

  it('ne redemande pas le profil pour un contact déjà existant (connexion)', async () => {
    await findOrCreateUser('+22891112233', 'client', TEST_PROFILE)
    const { user, created } = await findOrCreateUser('+22891112233', 'client')
    expect(created).toBe(false)
    expect(user.username).toBe('marie90')
  })
})

describe('userStore — coordonnées GPS optionnelles (géolocalisation à l\'inscription)', () => {
  it('persiste latitude/longitude quand fournies et les restitue via toPublicUser', async () => {
    const { user } = await findOrCreateUser('+22891112240', 'client', {
      ...TEST_PROFILE,
      latitude: 6.1319,
      longitude: 1.2228,
    })
    expect(user.latitude).toBe(6.1319)
    expect(user.longitude).toBe(1.2228)
    expect(toPublicUser(user).latitude).toBe(6.1319)
    expect(toPublicUser(user).longitude).toBe(1.2228)
  })

  it('reste absent (undefined) quand la géolocalisation n\'a pas été utilisée', async () => {
    const { user } = await findOrCreateUser('+22891112241', 'client', TEST_PROFILE)
    expect(user.latitude).toBeUndefined()
    expect(user.longitude).toBeUndefined()
    expect(toPublicUser(user)).not.toHaveProperty('latitude')
    expect(toPublicUser(user)).not.toHaveProperty('longitude')
  })
})
