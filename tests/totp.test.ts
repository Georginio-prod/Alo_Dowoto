import { describe, expect, it } from 'vitest'
import { base32Decode, base32Encode, buildOtpAuthUri, generateTotpSecret, verifyTotp } from '~~/server/utils/totp'

// Secret de test RFC 6238 : ASCII "12345678901234567890" (SHA1).
const RFC_SECRET_BASE32 = base32Encode(Buffer.from('12345678901234567890', 'ascii'))

describe('base32', () => {
  it('fait un aller-retour encode/decode', () => {
    const original = Buffer.from('12345678901234567890', 'ascii')
    expect(base32Decode(base32Encode(original))?.equals(original)).toBe(true)
  })

  it('tolère espaces, casse et remplissage', () => {
    const b32 = base32Encode(Buffer.from('WorkTogo', 'ascii'))
    const spaced = `${b32.slice(0, 4).toLowerCase()} ${b32.slice(4)}==`
    expect(base32Decode(spaced)?.equals(Buffer.from('WorkTogo', 'ascii'))).toBe(true)
  })

  it('rejette un caractère invalide', () => {
    expect(base32Decode('01890!')).toBeNull()
  })
})

describe('verifyTotp', () => {
  it('accepte le code du vecteur RFC 6238 (T=59s → 287082)', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, '287082', 59_000)).toBe(true)
  })

  it('tolère une dérive de ±1 pas (30 s)', () => {
    // Le même code 287082 (pas T=1) doit encore passer 29 s plus tôt/tard.
    expect(verifyTotp(RFC_SECRET_BASE32, '287082', 59_000 - 29_000)).toBe(true)
    expect(verifyTotp(RFC_SECRET_BASE32, '287082', 59_000 + 25_000)).toBe(true)
  })

  it('rejette au-delà de la fenêtre de dérive', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, '287082', 59_000 + 120_000)).toBe(false)
  })

  it('rejette un code malformé ou vide', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, '', 59_000)).toBe(false)
    expect(verifyTotp(RFC_SECRET_BASE32, '12345', 59_000)).toBe(false)
    expect(verifyTotp(RFC_SECRET_BASE32, 'abcdef', 59_000)).toBe(false)
  })

  it('rejette un secret illisible', () => {
    expect(verifyTotp('!!invalid!!', '287082', 59_000)).toBe(false)
  })
})

describe('génération', () => {
  it('produit un secret base32 non trivial', () => {
    const secret = generateTotpSecret()
    expect(secret.length).toBeGreaterThanOrEqual(32)
    expect(base32Decode(secret)).not.toBeNull()
  })

  it('construit une URI otpauth valide', () => {
    const uri = buildOtpAuthUri('ABCDEF', 'admin@worktogo.tg')
    expect(uri).toContain('otpauth://totp/')
    expect(uri).toContain('secret=ABCDEF')
    expect(uri).toContain('issuer=WorkTogo')
  })
})
