import { describe, expect, it } from 'vitest'
import { checkPasswordStrength, hashPassword, verifyPassword } from '~~/server/utils/password'

describe('password (#125 création, #126 connexion)', () => {
  it('vérifie un mot de passe correct', async () => {
    const hash = await hashPassword('Sup3r$ecret')
    expect(await verifyPassword('Sup3r$ecret', hash)).toBe(true)
  })

  it('rejette un mot de passe incorrect (cas limite)', async () => {
    const hash = await hashPassword('Sup3r$ecret')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('produit un hash différent à chaque appel (sel aléatoire)', async () => {
    const first = await hashPassword('Sup3r$ecret')
    const second = await hashPassword('Sup3r$ecret')
    expect(first).not.toBe(second)
  })

  it('accepte un mot de passe respectant toutes les règles', () => {
    expect(checkPasswordStrength('Sup3r$ecret')).toEqual({ ok: true, reasons: [] })
  })

  it('signale les règles manquantes (cas limite : trop court, sans majuscule/chiffre/spécial)', () => {
    const result = checkPasswordStrength('abcdefg')
    expect(result.ok).toBe(false)
    expect(result.reasons).toEqual(
      expect.arrayContaining(['8 caractères minimum', 'une majuscule', 'un chiffre', 'un caractère spécial']),
    )
  })
})
