import type { RequestHandler } from 'express'
import { forbidden, unauthorized } from '../utils/apiError'
import { asyncHandler } from '../utils/asyncHandler'
import { extractSessionToken, getSessionUser } from '../services/authService'
import { getAdminPermissions, hasPermission, type AdminPermission } from '../services/adminPermissionsService'

/**
 * Gardes d'authentification et d'autorisation du backend — répliquent
 * fidèlement `server/utils/requireSessionUser.ts` (cookie `wt_session` OU
 * Bearer), mêmes codes et mêmes messages (ADR-0016). L'utilisateur résolu est
 * posé sur `req.user` pour les handlers en aval.
 */

/** Exige un utilisateur connecté (401 sinon). */
export const requireSessionUser: RequestHandler = asyncHandler(async (req, _res, next) => {
  const user = await getSessionUser(extractSessionToken(req))
  if (!user) unauthorized() // 401 « Non connecté. »
  req.user = user
  next()
})

function requireRole(role: Role, message: string): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const user = await getSessionUser(extractSessionToken(req))
    if (!user) unauthorized()
    if (user.role !== role) forbidden(message) // 403
    req.user = user
    next()
  })
}

type Role = 'client' | 'prestataire' | 'admin'

/** Réservé aux comptes prestataire (routes /providers, /subscriptions, /payments). */
export const requireProviderRole = requireRole('prestataire', 'Réservé aux comptes prestataire.')

/** Réservé aux comptes client (routes /quotas/contacts, /favorites). */
export const requireClientRole = requireRole('client', 'Réservé aux comptes client.')

/** Réservé aux administrateurs (routes /admin/**). Message iso Nitro `requireAdminRole`. */
export const requireAdminRole = requireRole('admin', 'Réservé aux administrateurs.')

/**
 * Exige un admin connecté possédant la permission granulaire `key` (#admin) —
 * combine `requireAdminRole` (auth + rôle) et le contrôle de permission. Iso
 * `adminPermissions.requireAdminPermission`. L'utilisateur résolu est posé sur
 * `req.user`.
 */
export function requireAdminPermission(key: AdminPermission): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const user = await getSessionUser(extractSessionToken(req))
    if (!user) unauthorized()
    if (user.role !== 'admin') forbidden('Réservé aux administrateurs.')
    const perms = await getAdminPermissions(user.id)
    if (!hasPermission(perms, key)) forbidden('Permission insuffisante pour cette action.')
    req.user = user
    next()
  })
}
