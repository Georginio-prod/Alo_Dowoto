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
    throw createError({ statusCode: 400, statusMessage: 'Méthode de contact invalide.' })
  }

  const contact = normalizeContact(body.method, body.value ?? '')
  if (!contact) {
    throw createError({ statusCode: 400, statusMessage: 'Contact invalide.' })
  }

  const code = (body.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Code invalide. Réessayez.' })
  }

  const result = verifyOtp(contact, code)
  if (!result.ok) {
    throw createError({
      statusCode: result.reason === 'too_many_attempts' ? 429 : 400,
      statusMessage: ERROR_MESSAGES[result.reason],
    })
  }

  return { verified: true }
})
