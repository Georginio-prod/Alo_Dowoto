import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureServerError, isErrorReportingEnabled, scrubSensitiveData } from '~~/server/utils/errorReporting'

describe('isErrorReportingEnabled (#262 instrumentation d\'erreurs)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('est désactivée en l\'absence de SENTRY_DSN', () => {
    vi.stubEnv('SENTRY_DSN', '')
    expect(isErrorReportingEnabled()).toBe(false)
  })

  it('est activée dès qu\'un SENTRY_DSN est configuré', () => {
    vi.stubEnv('SENTRY_DSN', 'https://example.invalid/1')
    expect(isErrorReportingEnabled()).toBe(true)
  })
})

describe('captureServerError — no-op sans instrumentation activée', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('ne lève jamais, même pour une erreur non-Error', () => {
    vi.stubEnv('SENTRY_DSN', '')
    expect(() => captureServerError('une erreur textuelle brute')).not.toThrow()
    expect(() => captureServerError(new Error('boom'), { path: '/api/payments/initiate' })).not.toThrow()
  })
})

describe('scrubSensitiveData — anti-fuite avant envoi au fournisseur (#262)', () => {
  it('redacte les champs sensibles connus, quelle que soit la casse du nom', () => {
    const result = scrubSensitiveData({
      contact: '+228 90 12 34 56',
      Password: 'motdepasse',
      TOKEN: 'abc123',
      amount: 5000,
    })
    expect(result).toEqual({
      contact: '[redacted]',
      Password: '[redacted]',
      TOKEN: '[redacted]',
      amount: 5000,
    })
  })

  it('redacte un numéro de téléphone glissé dans un champ texte libre non listé', () => {
    const result = scrubSensitiveData({ description: 'Appelez-moi au +228 90 12 34 56 avant 18h' })
    expect(result.description).toBe('Appelez-moi au [redacted-phone] avant 18h')
  })

  it('parcourt récursivement objets imbriqués et tableaux', () => {
    const result = scrubSensitiveData({
      user: { contact: '90123456', username: 'marie90' },
      history: [{ operatorRef: 'OP-123', amount: 3000 }],
    })
    expect(result).toEqual({
      user: { contact: '[redacted]', username: 'marie90' },
      history: [{ operatorRef: '[redacted]', amount: 3000 }],
    })
  })

  it('laisse intactes les valeurs non sensibles (nombres, booléens, null)', () => {
    expect(scrubSensitiveData({ amount: 5000, verified: true, cvUrl: null })).toEqual({
      amount: 5000,
      verified: true,
      cvUrl: null,
    })
  })

  it('gère les cas limites (valeur primitive directe, tableau vide, objet vide)', () => {
    expect(scrubSensitiveData(42)).toBe(42)
    expect(scrubSensitiveData([])).toEqual([])
    expect(scrubSensitiveData({})).toEqual({})
  })
})
