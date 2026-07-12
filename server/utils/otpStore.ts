/**
 * Store en mémoire pour les codes OTP. Suffisant pour ce lot (pas de base de
 * données encore en place, voir #45/#46) mais ne survit pas à un redémarrage
 * ni à plusieurs instances du serveur — à remplacer par une table dédiée le
 * jour où #45/#46 sont faites.
 */

interface OtpEntry {
  code: string
  expiresAt: number
  attempts: number
  lastSentAt: number
}

const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_ATTEMPTS = 5
const VERIFIED_TTL_MS = 5 * 60 * 1000

const otpEntries = new Map<string, OtpEntry>()
const verifiedContacts = new Map<string, number>()

export type GenerateOtpResult =
  | { ok: true; code: string; expiresInSeconds: number }
  | { ok: false; retryAfterSeconds: number }

export function generateOtp(contact: string): GenerateOtpResult {
  const now = Date.now()
  const existing = otpEntries.get(contact)
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000),
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  otpEntries.set(contact, { code, expiresAt: now + OTP_TTL_MS, attempts: 0, lastSentAt: now })
  return { ok: true, code, expiresInSeconds: OTP_TTL_MS / 1000 }
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'too_many_attempts' | 'invalid' }

export function verifyOtp(contact: string, code: string): VerifyOtpResult {
  const now = Date.now()
  const entry = otpEntries.get(contact)

  if (!entry || entry.expiresAt < now) {
    otpEntries.delete(contact)
    return { ok: false, reason: 'expired' }
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' }
  }
  if (entry.code !== code) {
    entry.attempts += 1
    return { ok: false, reason: 'invalid' }
  }

  otpEntries.delete(contact)
  verifiedContacts.set(contact, now + VERIFIED_TTL_MS)
  return { ok: true }
}

/**
 * Consomme (à usage unique) la preuve qu'un contact vient de valider son
 * code OTP. Utilisé par #24 pour autoriser la création de session sans
 * dupliquer la logique de vérification.
 */
export function consumeVerifiedContact(contact: string): boolean {
  const expiresAt = verifiedContacts.get(contact)
  verifiedContacts.delete(contact)
  return !!expiresAt && expiresAt >= Date.now()
}
