import type { ContactMethod } from '~~/server/utils/contact'
import type { Role } from '~~/server/utils/userStore'

interface CreateSessionBody {
  method?: ContactMethod
  value?: string
  role?: Role
}

function toPublicUser(user: { id: string; contact: string; role: Role; createdAt: number }) {
  return { id: user.id, contact: user.contact, role: user.role, createdAt: user.createdAt }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateSessionBody>(event)

  if (body?.method !== 'phone' && body?.method !== 'email') {
    throw createError({ statusCode: 400, statusMessage: 'Méthode de contact invalide.' })
  }

  const contact = normalizeContact(body.method, body.value ?? '')
  if (!contact) {
    throw createError({ statusCode: 400, statusMessage: 'Contact invalide.' })
  }

  if (!consumeVerifiedContact(contact)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Ce contact n'a pas été vérifié par code OTP (voir /api/auth/otp/verify).",
    })
  }

  const role = body.role === 'client' || body.role === 'prestataire' ? body.role : undefined
  const { user, created } = findOrCreateUser(contact, role)

  const token = createSession(user.id)
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  setResponseStatus(event, created ? 201 : 200)
  return { user: toPublicUser(user), created }
})
