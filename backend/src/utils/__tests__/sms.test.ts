import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSmsConfigured, sendSms, smsProvider } from '../sms'

/**
 * Contrat du driver SMS (Brevo prioritaire, Twilio en repli — #23/#240).
 * `fetch` est mocké : aucune clé réelle, aucun crédit consommé. On couvre la
 * sélection du driver, la forme exacte de chaque appel (Brevo : destinataire
 * SANS « + » ; Twilio : `From` ou `MessagingServiceSid` selon le préfixe) et
 * les échecs qui ne doivent jamais lever mais renvoyer `ok: false`.
 */

const TO = '+22890000000'

function clearAll() {
  vi.stubEnv('BREVO_API_KEY', '')
  vi.stubEnv('BREVO_SMS_SENDER', '')
  vi.stubEnv('TWILIO_ACCOUNT_SID', '')
  vi.stubEnv('TWILIO_AUTH_TOKEN', '')
  vi.stubEnv('TWILIO_FROM', '')
}

function configureBrevo() {
  vi.stubEnv('BREVO_API_KEY', 'xkeysib-test')
  vi.stubEnv('BREVO_SMS_SENDER', 'WorkTogo')
}

function configureTwilio(from = '+15005550006') {
  vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACtest')
  vi.stubEnv('TWILIO_AUTH_TOKEN', 'secret')
  vi.stubEnv('TWILIO_FROM', from)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sélection du provider SMS', () => {
  it('aucune variable → aucun provider', () => {
    clearAll()
    expect(smsProvider()).toBeNull()
    expect(isSmsConfigured()).toBe(false)
  })

  it('clé Brevo sans BREVO_SMS_SENDER → non configuré (la clé email seule ne suffit pas)', () => {
    clearAll()
    vi.stubEnv('BREVO_API_KEY', 'xkeysib-test')
    expect(smsProvider()).toBeNull()
  })

  it('Brevo complet → brevo', () => {
    clearAll()
    configureBrevo()
    expect(smsProvider()).toBe('brevo')
  })

  it('Twilio complet (sans Brevo) → twilio', () => {
    clearAll()
    configureTwilio()
    expect(smsProvider()).toBe('twilio')
  })

  it('Brevo et Twilio configurés → Brevo prioritaire', () => {
    clearAll()
    configureBrevo()
    configureTwilio()
    expect(smsProvider()).toBe('brevo')
  })
})

describe('sendSms', () => {
  it('sans provider → ok: false sans appel réseau', async () => {
    clearAll()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendSms(TO, 'Code 123456')
    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('driver Brevo', () => {
    it('appelle l’API transactionalSMS avec le destinataire SANS « + » et le type transactional', async () => {
      clearAll()
      configureBrevo()
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)

      const result = await sendSms(TO, 'Code 123456')
      expect(result).toEqual({ ok: true })

      const [url, options] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }]
      expect(url).toBe('https://api.brevo.com/v3/transactionalSMS/sms')
      expect(options.method).toBe('POST')
      expect(options.headers['api-key']).toBe('xkeysib-test')
      expect(JSON.parse(options.body)).toEqual({
        sender: 'WorkTogo',
        recipient: '22890000000',
        content: 'Code 123456',
        type: 'transactional',
      })
    })

    it('réponse non-2xx → ok: false avec statut et détail (crédits épuisés, sender refusé…)', async () => {
      clearAll()
      configureBrevo()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => '{"code":"not_enough_credits"}',
      }))

      const result = await sendSms(TO, 'Code')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('402')
        expect(result.error).toContain('not_enough_credits')
      }
    })
  })

  describe('driver Twilio', () => {
    it('numéro expéditeur → champ From, auth Basic SID:token, corps form-urlencoded', async () => {
      clearAll()
      configureTwilio('+15005550006')
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)

      const result = await sendSms(TO, 'Code 123456')
      expect(result).toEqual({ ok: true })

      const [url, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }]
      expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json')
      expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('ACtest:secret').toString('base64')}`)
      const params = new URLSearchParams(options.body)
      expect(params.get('To')).toBe(TO)
      expect(params.get('Body')).toBe('Code 123456')
      expect(params.get('From')).toBe('+15005550006')
      expect(params.get('MessagingServiceSid')).toBeNull()
    })

    it('SID « MG… » → champ MessagingServiceSid au lieu de From', async () => {
      clearAll()
      configureTwilio('MGtestservice')
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)

      await sendSms(TO, 'Code')
      const [, options] = fetchMock.mock.calls[0] as [string, { body: string }]
      const params = new URLSearchParams(options.body)
      expect(params.get('MessagingServiceSid')).toBe('MGtestservice')
      expect(params.get('From')).toBeNull()
    })

    it('exception réseau → ok: false, ne lève jamais', async () => {
      clearAll()
      configureTwilio()
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ETIMEDOUT')))

      const result = await sendSms(TO, 'Code')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toContain('ETIMEDOUT')
    })
  })
})
