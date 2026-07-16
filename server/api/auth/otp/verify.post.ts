import type { ContactMethod } from '~~/server/utils/contact'

interface VerifyOtpBody {
  method?: ContactMethod
  value?: string
  code?: string
}

const ERROR_MESSAGES: Record<'expired' | 'too_many_attempts' | 'invalid', string> = {
  expired: 'Code expiré ou introuvable. Demandez un nouveau code.',
  too_many_attempts: 'Trop de tentatives. Demandez un nouveau code.',
  invalid: 'Code invalide. Réessayez.',
}

export default defineEventHandler(async (event) => {
  const body = await readBody<VerifyOtpBody>(event)

  if (body?.method !== 'phone' && body?.method !== 'email') {
    badRequest('Méthode de contact invalide.')
  }

  const contact = normalizeContact(body.method, body.value ?? '')
  if (!contact) {
    badRequest('Contact invalide.')
  }

  const code = (body.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    badRequest('Code invalide. Réessayez.')
  }

  const result = await verifyOtp(contact, code)
  if (!result.ok) {
    if (result.reason === 'too_many_attempts') {
      tooManyRequests(ERROR_MESSAGES[result.reason])
    }
    badRequest(ERROR_MESSAGES[result.reason])
  }

  return { verified: true }
})
