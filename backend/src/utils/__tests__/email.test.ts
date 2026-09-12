import { afterEach, describe, expect, it, vi } from 'vitest'
import { emailProvider, isEmailConfigured, sendEmail } from '../email'

/**
 * Contrat du driver email (Brevo, #23/#412). `fetch` est mocké : aucune clé
 * réelle, aucun réseau. On couvre la détection de configuration (les deux
 * variables sont requises), la forme exacte de l'appel Brevo (expéditeur
 * vérifié, destinataire, sujet, texte) et les deux familles d'échec (réponse
 * non-2xx, exception réseau) qui ne doivent jamais lever mais renvoyer `ok: false`.
 */

function configureBrevo(fromName?: string) {
  vi.stubEnv('BREVO_API_KEY', 'xkeysib-test')
  vi.stubEnv('EMAIL_FROM', 'noreply@worktogo.test')
  if (fromName === undefined) vi.stubEnv('EMAIL_FROM_NAME', '')
  else vi.stubEnv('EMAIL_FROM_NAME', fromName)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('détection du provider email', () => {
  it('aucune variable → aucun provider', () => {
    vi.stubEnv('BREVO_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', '')
    expect(emailProvider()).toBeNull()
    expect(isEmailConfigured()).toBe(false)
  })

  it('clé sans expéditeur → non configuré (l’expéditeur doit être vérifié chez Brevo)', () => {
    vi.stubEnv('BREVO_API_KEY', 'xkeysib-test')
    vi.stubEnv('EMAIL_FROM', '')
    expect(emailProvider()).toBeNull()
  })

  it('clé + expéditeur → brevo', () => {
    configureBrevo()
    expect(emailProvider()).toBe('brevo')
    expect(isEmailConfigured()).toBe(true)
  })
})

describe('sendEmail (Brevo)', () => {
  it('sans provider → ok: false sans appel réseau', async () => {
    vi.stubEnv('BREVO_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendEmail('ama@test.dev', 'Sujet', 'Corps')
    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('appelle l’API transactionnelle Brevo avec expéditeur, destinataire, sujet et texte', async () => {
    configureBrevo('WorkTogo Test')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendEmail('ama@test.dev', 'Votre code', 'Code 123456')
    expect(result).toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(options.method).toBe('POST')
    expect(options.headers['api-key']).toBe('xkeysib-test')
    expect(JSON.parse(options.body)).toEqual({
      sender: { email: 'noreply@worktogo.test', name: 'WorkTogo Test' },
      to: [{ email: 'ama@test.dev' }],
      subject: 'Votre code',
      textContent: 'Code 123456',
    })
  })

  it('nom d’expéditeur absent → « WorkTogo » par défaut', async () => {
    configureBrevo()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await sendEmail('ama@test.dev', 'Sujet', 'Corps')
    const [, options] = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(JSON.parse(options.body).sender.name).toBe('WorkTogo')
  })

  it('réponse non-2xx → ok: false avec le statut et le détail Brevo (clé invalide, expéditeur non vérifié…)', async () => {
    configureBrevo()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"message":"Key not found"}',
    }))

    const result = await sendEmail('ama@test.dev', 'Sujet', 'Corps')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('401')
      expect(result.error).toContain('Key not found')
    }
  })

  it('exception réseau → ok: false, ne lève jamais', async () => {
    configureBrevo()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))

    const result = await sendEmail('ama@test.dev', 'Sujet', 'Corps')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('ECONNRESET')
  })
})
