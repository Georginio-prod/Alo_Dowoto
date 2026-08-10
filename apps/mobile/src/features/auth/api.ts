import { request, requestWithSession } from '@/services/http'
import { sessionResponseSchema, userSchema, type RegisterPayload, type User } from './types'

/** Appels bruts d'authentification. Contrat backend inchangé (MIGRATION.md §3). */

export function sendOtp(method: 'phone' | 'email', value: string) {
  return request('/api/auth/otp/send', { method: 'POST', body: { method, value }, anonymous: true })
}

export function verifyOtp(method: 'phone' | 'email', value: string, code: string) {
  return request('/api/auth/otp/verify', {
    method: 'POST',
    body: { method, value, code },
    anonymous: true,
  })
}

/** Login/inscription : renvoie l'utilisateur ET le jeton Set-Cookie à stocker. */
export async function createSession(payload: RegisterPayload): Promise<{ user: User; token: string | null }> {
  const { data, token } = await requestWithSession('/api/auth/session', {
    method: 'POST',
    body: payload,
    schema: sessionResponseSchema,
    anonymous: true,
  })
  return { user: data.user, token }
}

export async function fetchSession(): Promise<User> {
  const data = await request('/api/auth/session', { schema: sessionResponseSchema })
  return data.user
}

export function destroySession() {
  return request('/api/auth/session', { method: 'DELETE' })
}

export function setPassword(password: string) {
  // confirmPassword requis par le backend (doit être égal) — un seul champ
  // côté app, on renvoie donc la même valeur.
  return request('/api/auth/password', {
    method: 'POST',
    body: { password, confirmPassword: password },
  })
}

export async function updateProfile(patch: Partial<User>): Promise<User> {
  const data = await request('/api/auth/profile', {
    method: 'PATCH',
    body: patch,
    schema: sessionResponseSchema,
  })
  return data.user
}

export { userSchema }
