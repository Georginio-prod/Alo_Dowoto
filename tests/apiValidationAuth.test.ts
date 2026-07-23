import { describe, expect, it } from 'vitest'
import {
  createSessionSchema,
  sendOtpSchema,
  setPasswordSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from '~~/server/utils/apiValidationAuth'

/** Retourne le premier message d'erreur d'un parse échoué (ou null si succès). */
function firstError(schema: { safeParse: (input: unknown) => { success: boolean, error?: { issues: { message: string }[] } } }, input: unknown): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : (result.error?.issues[0]?.message ?? '')
}

describe('sendOtpSchema (#23, validation POST /api/auth/otp/send)', () => {
  it('accepte un corps valide', () => {
    expect(sendOtpSchema.safeParse({ method: 'phone', value: '90112233' }).success).toBe(true)
  })

  it('rejette une méthode hors phone/email', () => {
    expect(firstError(sendOtpSchema, { method: 'whatsapp', value: '90112233' })).toBe('Méthode de contact invalide.')
    expect(firstError(sendOtpSchema, { value: '90112233' })).toBe('Méthode de contact invalide.')
  })

  it('value est optionnel côté forme (le format réel est vérifié par normalizeContact dans le handler)', () => {
    expect(sendOtpSchema.safeParse({ method: 'email' }).success).toBe(true)
  })
})

describe('verifyOtpSchema (#23, validation POST /api/auth/otp/verify)', () => {
  it('accepte un corps valide', () => {
    expect(verifyOtpSchema.safeParse({ method: 'phone', value: '90112233', code: '123456' }).success).toBe(true)
  })

  it('rejette une méthode invalide', () => {
    expect(firstError(verifyOtpSchema, { method: 'fax', value: '90112233', code: '123456' })).toBe('Méthode de contact invalide.')
  })

  it('value et code sont optionnels côté forme (le format réel — regex à 6 chiffres — reste vérifié dans le handler)', () => {
    const result = verifyOtpSchema.safeParse({ method: 'phone' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toBe('')
      expect(result.data.code).toBe('')
    }
  })
})

describe('setPasswordSchema (#125/#126, validation POST /api/auth/password)', () => {
  it('accepte un corps valide (changement de mot de passe)', () => {
    expect(setPasswordSchema.safeParse({ currentPassword: 'ancien', password: 'nouveau123', confirmPassword: 'nouveau123' }).success).toBe(true)
  })

  it('tous les champs sont optionnels côté forme (la correspondance/force restent vérifiées dans le handler)', () => {
    const result = setPasswordSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currentPassword).toBe('')
      expect(result.data.password).toBe('')
      expect(result.data.confirmPassword).toBe('')
    }
  })
})

describe('updateProfileSchema (validation PATCH /api/auth/profile)', () => {
  const MSG = "Nom d'utilisateur, prénom, nom et localisation sont requis."

  it('accepte un corps valide et trim chaque champ', () => {
    const result = updateProfileSchema.safeParse({ username: ' sam ', firstName: ' Sam ', lastName: ' Nova ', location: ' Lomé ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.username).toBe('sam')
      expect(result.data.firstName).toBe('Sam')
      expect(result.data.lastName).toBe('Nova')
      expect(result.data.location).toBe('Lomé')
    }
  })

  it('rejette chaque champ manquant ou vide après trim', () => {
    const valid = { username: 'sam', firstName: 'Sam', lastName: 'Nova', location: 'Lomé' }
    expect(firstError(updateProfileSchema, { ...valid, username: '   ' })).toBe(MSG)
    expect(firstError(updateProfileSchema, { ...valid, firstName: '' })).toBe(MSG)
    const { lastName: _lastName, ...withoutLastName } = valid
    expect(firstError(updateProfileSchema, withoutLastName)).toBe(MSG)
  })
})

describe('createSessionSchema (#125/#126, validation POST /api/auth/session)', () => {
  it('accepte un corps minimal (méthode seule)', () => {
    expect(createSessionSchema.safeParse({ method: 'email' }).success).toBe(true)
  })

  it('accepte un corps complet (inscription)', () => {
    const result = createSessionSchema.safeParse({
      method: 'phone',
      value: '90112233',
      role: 'client',
      username: 'sam',
      firstName: 'Sam',
      lastName: 'Nova',
      location: 'Lomé',
      latitude: 6.13,
      longitude: 1.22,
      rememberMe: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejette une méthode invalide', () => {
    expect(firstError(createSessionSchema, { method: 'carrier-pigeon' })).toBe('Méthode de contact invalide.')
  })

  it('rejette un rôle hors client/prestataire', () => {
    expect(firstError(createSessionSchema, { method: 'email', role: 'admin' })).toBeTruthy()
  })
})
