import type { Request } from 'express'
import type { User } from '@prisma/client'
import { unauthorized } from './apiError'

/**
 * Retourne l'utilisateur authentifié posé sur `req.user` par les gardes d'auth
 * (`requireSessionUser`, `requireProviderRole`, `requireClientRole`,
 * `requireAdminRole` — voir `src/middleware/auth.ts`).
 *
 * À utiliser dans les handlers montés DERRIÈRE une garde, à la place de
 * l'assertion non-null `req.user!` (interdite par ESLint) : le typage est narrow
 * en `User` et l'appel reste défensif — si une garde venait à manquer, on lève
 * un 401 « Non connecté. » au lieu de déréférencer `undefined`.
 */
export function authUser(req: Request): User {
  if (!req.user) unauthorized()
  return req.user
}
