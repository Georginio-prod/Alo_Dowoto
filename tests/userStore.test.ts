import { describe, expect, it } from 'vitest'
import {
  anonymizeUser,
  clearUserPosition,
  createSession,
  destroySession,
  findOrCreateUser,
  getSessionUser,
  getUserById,
  hasPassword,
  setPasswordHash,
  toPublicUser,
  type NewUserProfile,
} from '~~/server/utils/userStore'
import { getOrCreateReferralCode, listReferralsByReferrer } from '~~/server/utils/referralStore'

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
    const publicUser = await toPublicUser(reloaded)
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
    expect((await toPublicUser(user)).latitude).toBe(6.1319)
    expect((await toPublicUser(user)).longitude).toBe(1.2228)
  })

  it('reste absent (undefined) quand la géolocalisation n\'a pas été utilisée', async () => {
    const { user } = await findOrCreateUser('+22891112241', 'client', TEST_PROFILE)
    expect(user.latitude).toBeUndefined()
    expect(user.longitude).toBeUndefined()
    expect(await toPublicUser(user)).not.toHaveProperty('latitude')
    expect(await toPublicUser(user)).not.toHaveProperty('longitude')
  })
})

describe('userStore — droit à l’effacement, anonymisation du compte (#286)', () => {
  it('anonymizeUser efface les données personnelles identifiantes tout en conservant la ligne (historique financier)', async () => {
    const { user } = await findOrCreateUser('+22891112250', 'client', {
      ...TEST_PROFILE,
      latitude: 6.1319,
      longitude: 1.2228,
    })
    await setPasswordHash(user.id, 'salt:hash')

    await anonymizeUser(user.id)

    const anonymized = await getUserById(user.id)
    expect(anonymized?.id).toBe(user.id)
    expect(anonymized?.username).toBe('')
    expect(anonymized?.firstName).toBe('')
    expect(anonymized?.lastName).toBe('Compte supprimé')
    expect(anonymized?.location).toBe('')
    expect(anonymized?.latitude).toBeUndefined()
    expect(anonymized?.longitude).toBeUndefined()
    expect(anonymized ? hasPassword(anonymized) : true).toBe(false)
    expect(anonymized?.contact).toContain(user.id)
  })

  it('invalide toute session active du compte anonymisé', async () => {
    const { user } = await findOrCreateUser('+22891112251', 'client', TEST_PROFILE)
    const token = await createSession(user.id)

    await anonymizeUser(user.id)

    expect(await getSessionUser(token)).toBeNull()
  })

  it('deux comptes anonymisés n’entrent jamais en collision sur `contact` (unique)', async () => {
    const { user: first } = await findOrCreateUser('+22891112252', 'client', TEST_PROFILE)
    const { user: second } = await findOrCreateUser('+22891112253', 'client', TEST_PROFILE)

    await anonymizeUser(first.id)
    await expect(anonymizeUser(second.id)).resolves.not.toThrow()
  })
})

describe('userStore — code de parrainage saisi à l\'inscription (#365)', () => {
  it('lie le filleul à son parrain quand un code valide est fourni', async () => {
    const { user: referrer } = await findOrCreateUser('+22891112270', 'client', TEST_PROFILE)
    const code = await getOrCreateReferralCode(referrer.id)

    const { user: referred } = await findOrCreateUser('+22891112271', 'client', TEST_PROFILE, code)

    const referrals = await listReferralsByReferrer(referrer.id)
    expect(referrals).toHaveLength(1)
    expect(referrals[0]?.referredId).toBe(referred.id)
    expect(referrals[0]?.status).toBe('pending')
  })

  it('ignore silencieusement un code de parrainage invalide (n\'échoue jamais l\'inscription)', async () => {
    await expect(
      findOrCreateUser('+22891112272', 'client', TEST_PROFILE, 'CODEINCONNU'),
    ).resolves.not.toThrow()
  })

  it('ignore un code de parrainage quand aucun n\'est fourni (compte normal)', async () => {
    const { user } = await findOrCreateUser('+22891112273', 'client', TEST_PROFILE)
    expect(await listReferralsByReferrer(user.id)).toEqual([])
  })
})

describe('clearUserPosition (#geoloc, partie 3 — supprimer sa position sans supprimer son compte)', () => {
  it('efface latitude/longitude tout en conservant le reste du profil', async () => {
    const { user } = await findOrCreateUser('+22891112260', 'client', {
      ...TEST_PROFILE,
      latitude: 6.1319,
      longitude: 1.2228,
    })

    const updated = await clearUserPosition(user.id)

    expect(updated.latitude).toBeUndefined()
    expect(updated.longitude).toBeUndefined()
    expect(updated.location).toBe(TEST_PROFILE.location)
    expect(updated.username).toBe(TEST_PROFILE.username)
  })

  it('ne fait rien de destructeur pour un compte sans position enregistrée (cas limite)', async () => {
    const { user } = await findOrCreateUser('+22891112261', 'client', TEST_PROFILE)
    await expect(clearUserPosition(user.id)).resolves.not.toThrow()
  })
})
