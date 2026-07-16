import { prisma } from '~~/server/utils/prisma'

/**
 * Persistance des codes OTP en base (Prisma/SQLite, #218) : les codes et la
 * preuve de vérification survivent aux redémarrages du serveur, ce qui
 * fiabilise le parcours d'inscription/connexion en développement comme en
 * production multi-instances.
 */

const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_ATTEMPTS = 5
const VERIFIED_TTL_MS = 5 * 60 * 1000

export type GenerateOtpResult =
  | { ok: true; code: string; expiresInSeconds: number }
  | { ok: false; retryAfterSeconds: number }

export async function generateOtp(contact: string): Promise<GenerateOtpResult> {
  const now = Date.now()
  const existing = await prisma.otpCode.findUnique({ where: { contact } })
  if (existing && now - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000),
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const data = { code, expiresAt: new Date(now + OTP_TTL_MS), attempts: 0, lastSentAt: new Date(now) }
  await prisma.otpCode.upsert({ where: { contact }, create: { contact, ...data }, update: data })
  return { ok: true, code, expiresInSeconds: OTP_TTL_MS / 1000 }
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'too_many_attempts' | 'invalid' }

export async function verifyOtp(contact: string, code: string): Promise<VerifyOtpResult> {
  const now = Date.now()
  const entry = await prisma.otpCode.findUnique({ where: { contact } })

  if (!entry || entry.expiresAt.getTime() < now) {
    await prisma.otpCode.deleteMany({ where: { contact } })
    return { ok: false, reason: 'expired' }
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' }
  }
  if (entry.code !== code) {
    await prisma.otpCode.update({ where: { contact }, data: { attempts: { increment: 1 } } })
    return { ok: false, reason: 'invalid' }
  }

  await prisma.otpCode.deleteMany({ where: { contact } })
  const expiresAt = new Date(now + VERIFIED_TTL_MS)
  await prisma.verifiedContact.upsert({
    where: { contact },
    create: { contact, expiresAt },
    update: { expiresAt },
  })
  return { ok: true }
}

/**
 * Consomme (à usage unique) la preuve qu'un contact vient de valider son
 * code OTP. Utilisé par #24 pour autoriser la création de session sans
 * dupliquer la logique de vérification.
 */
export async function consumeVerifiedContact(contact: string): Promise<boolean> {
  const entry = await prisma.verifiedContact.findUnique({ where: { contact } })
  if (!entry) return false
  await prisma.verifiedContact.deleteMany({ where: { contact } })
  return entry.expiresAt.getTime() >= Date.now()
}
