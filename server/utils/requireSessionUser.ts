import type { H3Event } from 'h3'
import type { User } from '~~/server/utils/userStore'

export function requireSessionUser(event: H3Event): User {
  const token = getCookie(event, SESSION_COOKIE)
  const user = getSessionUser(token)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Non connecté.' })
  }

  return user
}
