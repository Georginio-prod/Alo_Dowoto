import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSmsConfigured, sendSms } from '~~/server/utils/sms'

const TWILIO_ENV = {
  TWILIO_ACCOUNT_SID: 'ACtest',
  TWILIO_AUTH_TOKEN: 'secret',
  TWILIO_FROM: '+15550001111',
}

function configureTwilio(overrides: Partial<typeof TWILIO_ENV> = {}) {
  for (const [key, value] of Object.entries({ ...TWILIO_ENV, ...overrides })) {
    vi.stubEnv(key, value)
  }
}

describe('sms (#23 envoi OTP par SMS)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("n'est pas configuré sans variables TWILIO_*", () => {
    expect(isSmsConfigured()).toBe(false)
  })

  it('est configuré quand les trois variables TWILIO_* sont définies', () => {
    configureTwilio()
    expect(isSmsConfigured()).toBe(true)
  })

  it('échoue sans lever quand aucun provider n’est configuré', async () => {
    const result = await sendSms('+22890000000', 'code 123456')
    expect(result.ok).toBe(false)
  })

  it('envoie le SMS via l’API Twilio avec le bon expéditeur', async () => {
    configureTwilio()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }))

    const result = await sendSms('+22890000000', 'WorkTogo : votre code est 123456.')

    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json')
    const params = new URLSearchParams(String(init?.body))
    expect(params.get('To')).toBe('+22890000000')
    expect(params.get('From')).toBe('+15550001111')
    expect(params.get('Body')).toContain('123456')
  })

  it('utilise MessagingServiceSid quand TWILIO_FROM est un SID "MG…" (cas limite)', async () => {
    configureTwilio({ TWILIO_FROM: 'MGtestservice' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }))

    await sendSms('+22890000000', 'code')

    const params = new URLSearchParams(String((fetchMock.mock.calls[0] ?? [])[1]?.body))
    expect(params.get('MessagingServiceSid')).toBe('MGtestservice')
    expect(params.get('From')).toBeNull()
  })

  it('renvoie une erreur (sans lever) quand Twilio répond une erreur HTTP', async () => {
    configureTwilio()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"message":"Invalid To"}', { status: 400 }))

    const result = await sendSms('+22890000000', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('400')
  })

  it('renvoie une erreur (sans lever) quand l’appel réseau échoue (cas limite)', async () => {
    configureTwilio()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('réseau indisponible'))

    const result = await sendSms('+22890000000', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('réseau indisponible')
  })

  it('est configuré via Brevo (BREVO_API_KEY + BREVO_SMS_SENDER)', () => {
    vi.stubEnv('BREVO_API_KEY', 'xkeysib-test')
    vi.stubEnv('BREVO_SMS_SENDER', 'WorkTogo')
    expect(isSmsConfigured()).toBe(true)
  })

  it('envoie via l’API Brevo avec le destinataire sans "+" et le bon sender', async () => {
    vi.stubEnv('BREVO_API_KEY', 'xkeysib-test')
    vi.stubEnv('BREVO_SMS_SENDER', 'WorkTogo')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }))

    const result = await sendSms('+22890000000', 'WorkTogo : votre code est 123456.')

    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.brevo.com/v3/transactionalSMS/sms')
    expect((init?.headers as Record<string, string>)['api-key']).toBe('xkeysib-test')
    const payload = JSON.parse(String(init?.body))
    expect(payload.recipient).toBe('22890000000')
    expect(payload.sender).toBe('WorkTogo')
    expect(payload.type).toBe('transactional')
    expect(payload.content).toContain('123456')
  })

  it('préfère Brevo à Twilio quand les deux sont configurés', async () => {
    configureTwilio()
    vi.stubEnv('BREVO_API_KEY', 'xkeysib-test')
    vi.stubEnv('BREVO_SMS_SENDER', 'WorkTogo')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }))

    await sendSms('+22890000000', 'code')

    expect(String((fetchMock.mock.calls[0] ?? [])[0])).toContain('api.brevo.com')
  })
})
