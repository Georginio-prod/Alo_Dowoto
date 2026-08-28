import { otpRepository, type OtpRepository } from '../repositories/otpRepository'
import { normalizeContact, type ContactMethod } from '../utils/contact'
import { badGateway, badRequest, tooManyRequests } from '../utils/apiError'
import { isEmailConfigured, sendEmail } from '../utils/email'
import { isSmsConfigured, sendSms } from '../utils/sms'
import { env } from '../config/env'

/**
 * Vérification de contact par code OTP (#23) et preuve de vérification à usage
 * unique consommée par la création de session (#24). Logique **portée iso**
 * depuis `server/utils/otpStore.ts` et les handlers `server/api/auth/otp/*`
 * (ADR-0016) : mêmes TTL, même cooldown, même plafond de tentatives, mêmes
 * messages, même repli développement (code journalisé + `devCode`).
 */

const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_ATTEMPTS = 5
const VERIFIED_TTL_MS = 5 * 60 * 1000
/** TTL plus large pour une vérification hors OTP (email Google vérifié, #219). */
const GOOGLE_VERIFIED_TTL_MS = 15 * 60 * 1000

type GenerateOtpResult =
  | { ok: true; code: string; expiresInSeconds: number }
  | { ok: false; retryAfterSeconds: number }

type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'too_many_attempts' | 'invalid' }

const VERIFY_ERROR_MESSAGES: Record<'expired' | 'too_many_attempts' | 'invalid', string> = {
  expired: 'Code expiré ou introuvable. Demandez un nouveau code.',
  too_many_attempts: 'Trop de tentatives. Demandez un nouveau code.',
  invalid: 'Code invalide. Réessayez.',
}

/** Dépendances d'envoi, injectables pour les tests (pas de réseau réel). */
export interface OtpDelivery {
  isEmailConfigured: () => boolean
  isSmsConfigured: () => boolean
  sendEmail: typeof sendEmail
  sendSms: typeof sendSms
}

const defaultDelivery: OtpDelivery = { isEmailConfigured, isSmsConfigured, sendEmail, sendSms }

export function createOtpService(repo: OtpRepository = otpRepository, delivery: OtpDelivery = defaultDelivery) {
  /** Génère (ou refuse pendant le cooldown) un code pour un contact. Iso `generateOtp`. */
  async function generateOtp(contact: string): Promise<GenerateOtpResult> {
    const now = Date.now()
    const existing = await repo.findCode(contact)
    if (existing && now - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return { ok: false, retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000) }
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await repo.upsertCode(contact, code, new Date(now + OTP_TTL_MS), new Date(now))
    return { ok: true, code, expiresInSeconds: OTP_TTL_MS / 1000 }
  }

  /** Vérifie un code et, si valide, dépose la preuve de vérification. Iso `verifyOtp`. */
  async function verifyOtp(contact: string, code: string): Promise<VerifyOtpResult> {
    const now = Date.now()
    const entry = await repo.findCode(contact)
    if (!entry || entry.expiresAt.getTime() < now) {
      await repo.deleteCode(contact)
      return { ok: false, reason: 'expired' }
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      return { ok: false, reason: 'too_many_attempts' }
    }
    if (entry.code !== code) {
      await repo.incrementAttempts(contact)
      return { ok: false, reason: 'invalid' }
    }
    await repo.deleteCode(contact)
    await repo.upsertVerifiedContact(contact, new Date(now + VERIFIED_TTL_MS))
    return { ok: true }
  }

  return {
    /**
     * Marque un contact comme vérifié sans OTP — identité prouvée autrement
     * (email Google vérifié, #219). Iso `otpStore.markContactVerified`.
     */
    async markContactVerified(contact: string, ttlMs = GOOGLE_VERIFIED_TTL_MS): Promise<void> {
      await repo.upsertVerifiedContact(contact, new Date(Date.now() + ttlMs))
    },

    /**
     * Consomme (à usage unique) la preuve qu'un contact vient de valider son
     * code OTP. Autorise la création de session (#24). Iso `consumeVerifiedContact`.
     */
    async consumeVerifiedContact(contact: string): Promise<boolean> {
      const entry = await repo.findVerifiedContact(contact)
      if (!entry) return false
      await repo.deleteVerifiedContact(contact)
      return entry.expiresAt.getTime() >= Date.now()
    },

    /**
     * `POST /api/auth/otp/send` : normalise, génère et envoie le code. Lève un
     * 400 (contact invalide), 429 (cooldown) ou 502 (échec provider), iso Nitro.
     * `devCode` renvoyé uniquement hors production quand aucun envoi réel n'a eu
     * lieu, pour tester le parcours sans provider SMS/email.
     */
    async requestOtp(method: ContactMethod, value: string) {
      const contact = normalizeContact(method, value)
      if (!contact) {
        badRequest(method === 'phone' ? 'Entrez un numéro valide (8 chiffres).' : 'Entrez une adresse email valide.')
      }

      const result = await generateOtp(contact)
      if (!result.ok) {
        tooManyRequests('Veuillez patienter avant de renvoyer un code.', { retryAfterSeconds: result.retryAfterSeconds })
      }

      const expiresInMinutes = Math.floor(result.expiresInSeconds / 60)
      const message = `WorkTogo : votre code de vérification est ${result.code}. Il expire dans ${expiresInMinutes} minutes.`
      const reallySent = method === 'phone' ? delivery.isSmsConfigured() : delivery.isEmailConfigured()

      if (reallySent) {
        const sent = method === 'phone'
          ? await delivery.sendSms(contact, message)
          : await delivery.sendEmail(contact, 'Votre code de vérification WorkTogo', message)
        if (!sent.ok) {
          console.error(`[otp] Échec d'envoi ${method === 'phone' ? 'du SMS' : "de l'email"} à ${contact} : ${sent.error}`)
          badGateway(
            method === 'phone'
              ? 'Impossible d’envoyer le SMS pour le moment. Réessayez dans quelques instants.'
              : 'Impossible d’envoyer l’email pour le moment. Réessayez dans quelques instants.',
          )
        }
      } else {
        // Repli développement : le code est journalisé côté serveur.
        console.warn(`[otp] Code ${result.code} pour ${contact} (expire dans ${result.expiresInSeconds}s)`)
      }

      return {
        ok: true as const,
        expiresInSeconds: result.expiresInSeconds,
        ...(!env.isProd && !reallySent ? { devCode: result.code } : {}),
      }
    },

    /**
     * `POST /api/auth/otp/verify` : normalise, valide la forme du code puis le
     * vérifie. Lève un 400 (contact/code invalide, expiré) ou 429 (trop de
     * tentatives), iso Nitro. Renvoie `{ verified: true }` en cas de succès.
     */
    async confirmOtp(method: ContactMethod, value: string, rawCode: string) {
      const contact = normalizeContact(method, value)
      if (!contact) badRequest('Contact invalide.')

      const code = rawCode.trim()
      if (!/^\d{6}$/.test(code)) badRequest('Code invalide. Réessayez.')

      const result = await verifyOtp(contact, code)
      if (!result.ok) {
        if (result.reason === 'too_many_attempts') tooManyRequests(VERIFY_ERROR_MESSAGES[result.reason])
        badRequest(VERIFY_ERROR_MESSAGES[result.reason])
      }

      return { verified: true as const }
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const otpService = createOtpService()
