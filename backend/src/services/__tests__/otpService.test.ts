import type { OtpCode, VerifiedContact } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OtpRepository } from '../../repositories/otpRepository'
import { HttpError } from '../../utils/apiError'
import { createOtpService, type OtpDelivery } from '../otpService'

/**
 * Contrat du service OTP (#23/#24) avec repository en mémoire et drivers
 * d'envoi factices : ni base, ni réseau. L'objectif est la **parité SMS/email**
 * — même code, même message, même TTL, même repli dev, mêmes erreurs — plus les
 * deux garde-fous ajoutés au portage : 503 en production sans provider, et
 * libération du cooldown après un échec d'envoi (502).
 */

function createMemoryRepo() {
  const codes = new Map<string, OtpCode>()
  const verified = new Map<string, VerifiedContact>()
  const repo: OtpRepository = {
    async findCode(contact) {
      return codes.get(contact) ?? null
    },
    async upsertCode(contact, code, expiresAt, lastSentAt) {
      codes.set(contact, { contact, code, expiresAt, lastSentAt, attempts: 0 })
    },
    async incrementAttempts(contact) {
      const entry = codes.get(contact)
      if (entry) entry.attempts += 1
    },
    async deleteCode(contact) {
      codes.delete(contact)
    },
    async findVerifiedContact(contact) {
      return verified.get(contact) ?? null
    },
    async upsertVerifiedContact(contact, expiresAt) {
      verified.set(contact, { contact, expiresAt })
    },
    async deleteVerifiedContact(contact) {
      verified.delete(contact)
    },
  }
  return { repo, codes, verified }
}

function createFakeDelivery(config: { email: boolean; sms: boolean }, fail = false): OtpDelivery {
  const failure = { ok: false as const, error: 'provider KO' }
  return {
    isEmailConfigured: () => config.email,
    isSmsConfigured: () => config.sms,
    sendEmail: vi.fn(async () => (fail ? failure : { ok: true as const })),
    sendSms: vi.fn(async () => (fail ? failure : { ok: true as const })),
  }
}

/** Exécute `fn` et renvoie l'HttpError levée (échoue si rien n'est levé). */
async function expectHttpError(fn: () => Promise<unknown>): Promise<HttpError> {
  try {
    await fn()
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError)
    return error as HttpError
  }
  throw new Error('Une HttpError était attendue.')
}

const EMAIL = 'Ama.Koffi@Test.dev'
const EMAIL_NORMALIZED = 'ama.koffi@test.dev'
const PHONE = '90 00 00 00'
const PHONE_NORMALIZED = '+22890000000'

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => vi.restoreAllMocks())

describe('requestOtp — parité SMS / email avec provider configuré', () => {
  it('email : envoie le code stocké à l’adresse normalisée, sans devCode', async () => {
    const { repo, codes } = createMemoryRepo()
    const delivery = createFakeDelivery({ email: true, sms: true })
    const service = createOtpService(repo, delivery, { isProd: false })

    const result = await service.requestOtp('email', EMAIL)

    expect(result).toEqual({ ok: true, expiresInSeconds: 600 })
    expect('devCode' in result).toBe(false)
    const stored = codes.get(EMAIL_NORMALIZED)
    expect(stored?.code).toMatch(/^\d{6}$/)
    expect(delivery.sendEmail).toHaveBeenCalledWith(
      EMAIL_NORMALIZED,
      'Votre code de vérification WorkTogo',
      `WorkTogo : votre code de vérification est ${stored!.code}. Il expire dans 10 minutes.`,
    )
    expect(delivery.sendSms).not.toHaveBeenCalled()
  })

  it('téléphone : envoie le code stocké au numéro E.164, sans devCode', async () => {
    const { repo, codes } = createMemoryRepo()
    const delivery = createFakeDelivery({ email: true, sms: true })
    const service = createOtpService(repo, delivery, { isProd: false })

    const result = await service.requestOtp('phone', PHONE)

    expect(result).toEqual({ ok: true, expiresInSeconds: 600 })
    const stored = codes.get(PHONE_NORMALIZED)
    expect(stored?.code).toMatch(/^\d{6}$/)
    expect(delivery.sendSms).toHaveBeenCalledWith(
      PHONE_NORMALIZED,
      `WorkTogo : votre code de vérification est ${stored!.code}. Il expire dans 10 minutes.`,
    )
    expect(delivery.sendEmail).not.toHaveBeenCalled()
  })

  it('les deux canaux portent exactement le même message (seul le code change)', async () => {
    const { repo } = createMemoryRepo()
    const delivery = createFakeDelivery({ email: true, sms: true })
    const service = createOtpService(repo, delivery, { isProd: false })

    await service.requestOtp('email', EMAIL)
    await service.requestOtp('phone', PHONE)

    const emailBody = (delivery.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][2] as string
    const smsBody = (delivery.sendSms as ReturnType<typeof vi.fn>).mock.calls[0][1] as string
    const strip = (s: string) => s.replace(/\d{6}/, '######')
    expect(strip(emailBody)).toBe(strip(smsBody))
  })

  it('en production avec provider : envoi réel, jamais de devCode', async () => {
    const { repo } = createMemoryRepo()
    const delivery = createFakeDelivery({ email: true, sms: true })
    const service = createOtpService(repo, delivery, { isProd: true })

    const byEmail = await service.requestOtp('email', EMAIL)
    const bySms = await service.requestOtp('phone', PHONE)
    expect('devCode' in byEmail).toBe(false)
    expect('devCode' in bySms).toBe(false)
    expect(delivery.sendEmail).toHaveBeenCalledTimes(1)
    expect(delivery.sendSms).toHaveBeenCalledTimes(1)
  })
})

describe('requestOtp — canal sans provider', () => {
  it('hors production : repli devCode identique pour les deux canaux, aucun envoi', async () => {
    const { repo, codes } = createMemoryRepo()
    const delivery = createFakeDelivery({ email: false, sms: false })
    const service = createOtpService(repo, delivery, { isProd: false })

    const byEmail = await service.requestOtp('email', EMAIL)
    const bySms = await service.requestOtp('phone', PHONE)

    expect(byEmail).toEqual({ ok: true, expiresInSeconds: 600, devCode: codes.get(EMAIL_NORMALIZED)!.code })
    expect(bySms).toEqual({ ok: true, expiresInSeconds: 600, devCode: codes.get(PHONE_NORMALIZED)!.code })
    expect(delivery.sendEmail).not.toHaveBeenCalled()
    expect(delivery.sendSms).not.toHaveBeenCalled()
  })

  it('canaux asymétriques : l’email part réellement, le SMS reste en devCode', async () => {
    const { repo } = createMemoryRepo()
    const delivery = createFakeDelivery({ email: true, sms: false })
    const service = createOtpService(repo, delivery, { isProd: false })

    const byEmail = await service.requestOtp('email', EMAIL)
    const bySms = await service.requestOtp('phone', PHONE)

    expect('devCode' in byEmail).toBe(false)
    expect(bySms).toHaveProperty('devCode')
    expect(delivery.sendEmail).toHaveBeenCalledTimes(1)
    expect(delivery.sendSms).not.toHaveBeenCalled()
  })

  it('en production : 503 explicite, aucun code généré', async () => {
    const { repo, codes } = createMemoryRepo()
    const delivery = createFakeDelivery({ email: true, sms: false })
    const service = createOtpService(repo, delivery, { isProd: true })

    const error = await expectHttpError(() => service.requestOtp('phone', PHONE))

    expect(error.statusCode).toBe(503)
    expect(error.message).toContain('SMS')
    expect(codes.size).toBe(0)
    expect(delivery.sendSms).not.toHaveBeenCalled()
  })
})

describe('requestOtp — erreurs', () => {
  it('contact invalide → 400 (message propre au canal)', async () => {
    const service = createOtpService(createMemoryRepo().repo, createFakeDelivery({ email: true, sms: true }), { isProd: false })

    const phone = await expectHttpError(() => service.requestOtp('phone', '123'))
    expect(phone.statusCode).toBe(400)
    expect(phone.message).toContain('numéro')

    const email = await expectHttpError(() => service.requestOtp('email', 'pas-un-email'))
    expect(email.statusCode).toBe(400)
    expect(email.message).toContain('email')
  })

  it('renvoi pendant le cooldown → 429 avec retryAfterSeconds', async () => {
    const service = createOtpService(createMemoryRepo().repo, createFakeDelivery({ email: true, sms: true }), { isProd: false })

    await service.requestOtp('phone', PHONE)
    const error = await expectHttpError(() => service.requestOtp('phone', PHONE))

    expect(error.statusCode).toBe(429)
    expect(error.data?.retryAfterSeconds).toBeGreaterThan(0)
    expect(error.data?.retryAfterSeconds).toBeLessThanOrEqual(30)
  })

  it('échec du provider → 502 et cooldown libéré (nouvelle demande immédiate acceptée)', async () => {
    const { repo, codes } = createMemoryRepo()
    const failing = createFakeDelivery({ email: true, sms: true }, true)
    const service = createOtpService(repo, failing, { isProd: false })

    const error = await expectHttpError(() => service.requestOtp('phone', PHONE))
    expect(error.statusCode).toBe(502)
    expect(error.message).toContain('SMS')
    expect(codes.has(PHONE_NORMALIZED)).toBe(false)

    // Le provider revient : la demande suivante n'est plus bloquée par le cooldown.
    const healthy = createOtpService(repo, createFakeDelivery({ email: true, sms: true }), { isProd: false })
    await expect(healthy.requestOtp('phone', PHONE)).resolves.toMatchObject({ ok: true })
  })
})

describe('confirmOtp / consumeVerifiedContact', () => {
  async function sendAndGetCode(method: 'phone' | 'email', value: string) {
    const { repo, codes } = createMemoryRepo()
    const service = createOtpService(repo, createFakeDelivery({ email: false, sms: false }), { isProd: false })
    const { devCode } = await service.requestOtp(method, value)
    return { service, codes, code: devCode! }
  }

  it('bon code (SMS) → vérifié, preuve consommable une seule fois, code supprimé', async () => {
    const { service, codes, code } = await sendAndGetCode('phone', PHONE)

    await expect(service.confirmOtp('phone', PHONE, code)).resolves.toEqual({ verified: true })
    expect(codes.has(PHONE_NORMALIZED)).toBe(false)
    expect(await service.consumeVerifiedContact(PHONE_NORMALIZED)).toBe(true)
    expect(await service.consumeVerifiedContact(PHONE_NORMALIZED)).toBe(false)
  })

  it('bon code (email) → même contrat que le SMS, contact normalisé en minuscules', async () => {
    const { service, code } = await sendAndGetCode('email', EMAIL)

    await expect(service.confirmOtp('email', EMAIL, ` ${code} `)).resolves.toEqual({ verified: true })
    expect(await service.consumeVerifiedContact(EMAIL_NORMALIZED)).toBe(true)
  })

  it('code mal formé → 400 sans consommer de tentative', async () => {
    const { service, codes } = await sendAndGetCode('phone', PHONE)

    const error = await expectHttpError(() => service.confirmOtp('phone', PHONE, '12ab'))
    expect(error.statusCode).toBe(400)
    expect(codes.get(PHONE_NORMALIZED)?.attempts).toBe(0)
  })

  it('code erroné → 400 et tentative comptée ; 5 tentatives → 429', async () => {
    const { service, codes, code } = await sendAndGetCode('phone', PHONE)
    const wrong = code === '000000' ? '111111' : '000000'

    for (let i = 1; i <= 5; i++) {
      const error = await expectHttpError(() => service.confirmOtp('phone', PHONE, wrong))
      expect(error.statusCode).toBe(400)
      expect(codes.get(PHONE_NORMALIZED)?.attempts).toBe(i)
    }
    const blocked = await expectHttpError(() => service.confirmOtp('phone', PHONE, code))
    expect(blocked.statusCode).toBe(429)
  })

  it('code expiré → 400 et code purgé', async () => {
    const { service, codes, code } = await sendAndGetCode('email', EMAIL)
    codes.get(EMAIL_NORMALIZED)!.expiresAt = new Date(Date.now() - 1000)

    const error = await expectHttpError(() => service.confirmOtp('email', EMAIL, code))
    expect(error.statusCode).toBe(400)
    expect(error.message).toContain('expiré')
    expect(codes.has(EMAIL_NORMALIZED)).toBe(false)
  })

  it('aucun code demandé → 400 « expiré ou introuvable »', async () => {
    const service = createOtpService(createMemoryRepo().repo, createFakeDelivery({ email: false, sms: false }), { isProd: false })
    const error = await expectHttpError(() => service.confirmOtp('phone', PHONE, '123456'))
    expect(error.statusCode).toBe(400)
  })
})
