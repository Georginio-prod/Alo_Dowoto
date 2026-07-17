import { afterEach, describe, expect, it, vi } from 'vitest'
import { isEmailConfigured, sendEmail } from '~~/server/utils/email'

const BREVO_ENV = {
  BREVO_API_KEY: 'xkeysib-test',
  EMAIL_FROM: 'no-reply@worktogo.tg',
}

function configureBrevo(overrides: Record<string, string> = {}) {
  for (const [key, value] of Object.entries({ ...BREVO_ENV, ...overrides })) {
    vi.stubEnv(key, value)
  }
}

describe('email (#23 envoi OTP par email)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("n'est pas configuré sans variables BREVO_API_KEY / EMAIL_FROM", () => {
    expect(isEmailConfigured()).toBe(false)
  })

  it('est configuré quand BREVO_API_KEY et EMAIL_FROM sont définis', () => {
    configureBrevo()
    expect(isEmailConfigured()).toBe(true)
  })

  it('échoue sans lever quand aucun provider n’est configuré', async () => {
    const result = await sendEmail('client@example.com', 'Sujet', 'code 123456')
    expect(result.ok).toBe(false)
  })

  it('envoie l’email via l’API Brevo avec le bon expéditeur et destinataire', async () => {
    configureBrevo({ EMAIL_FROM_NAME: 'WorkTogo Test' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }))

    const result = await sendEmail('client@example.com', 'Votre code', 'WorkTogo : votre code est 123456.')

    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.brevo.com/v3/smtp/email')
    expect((init?.headers as Record<string, string>)['api-key']).toBe('xkeysib-test')
    const payload = JSON.parse(String(init?.body))
    expect(payload.sender).toEqual({ email: 'no-reply@worktogo.tg', name: 'WorkTogo Test' })
    expect(payload.to).toEqual([{ email: 'client@example.com' }])
    expect(payload.subject).toBe('Votre code')
    expect(payload.textContent).toContain('123456')
  })

  it('utilise "WorkTogo" comme nom d’expéditeur par défaut (cas limite)', async () => {
    configureBrevo()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }))

    await sendEmail('client@example.com', 'Sujet', 'code')

    const payload = JSON.parse(String((fetchMock.mock.calls[0] ?? [])[1]?.body))
    expect(payload.sender.name).toBe('WorkTogo')
  })

  it('renvoie une erreur (sans lever) quand Brevo répond une erreur HTTP', async () => {
    configureBrevo()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"message":"unauthorized"}', { status: 401 }))

    const result = await sendEmail('client@example.com', 'Sujet', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('401')
  })

  it('renvoie une erreur (sans lever) quand l’appel réseau échoue (cas limite)', async () => {
    configureBrevo()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('réseau indisponible'))

    const result = await sendEmail('client@example.com', 'Sujet', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('réseau indisponible')
  })
})
