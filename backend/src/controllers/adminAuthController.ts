import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest, tooManyRequests, unauthorized } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { normalizeContact } from '../utils/contact'
import { hashPassword, verifyPassword } from '../utils/password'
import { createSession, destroySession } from '../services/authService'
import { aiRateLimitService } from '../services/aiRateLimitService'
import { userRepository } from '../repositories/userRepository'
import { toUser, userService } from '../services/userService'
import { auditLogService } from '../services/auditLogService'
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  getAdminPermissions,
  parsePermissions,
  serializePermissions,
} from '../services/adminPermissionsService'
import type { promoteAdminSchema } from '../validation/schemas/admin'

/**
 * Authentification et gestion des comptes du dashboard admin desktop (#admin),
 * portées iso depuis `server/api/admin/{login,logout,session,admins,team}` (ADR-0016).
 * Le dashboard Electron porte le jeton en `Authorization: Bearer` (pas de cookie).
 * login/createAdmin parsent le corps à la main (mêmes messages, même ordre).
 */

// Anti brute-force (audit M1) : au plus 10 tentatives par IP/15 min ; une
// connexion réussie remet le compteur à zéro. Iso Nitro.
const MAX_LOGIN_ATTEMPTS = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

/** IP de la requête, en priorité l'en-tête `x-forwarded-for` (tunnel/proxy). Iso `getRequestIP({xForwardedFor})`. */
function requestIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  const header = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const first = header?.split(',')[0]?.trim()
  return first || req.ip || req.socket.remoteAddress || 'unknown'
}

/** Jeton porté en `Authorization: Bearer <token>`, ou `undefined`. */
function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization
  return header && header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined
}

/** POST /api/admin/login — email + mot de passe, renvoie un jeton Bearer. */
export async function adminLogin(req: Request, res: Response): Promise<void> {
  const rateKey = `admin-login:${requestIp(req)}`
  if (await aiRateLimitService.isRateLimited(rateKey, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)) {
    tooManyRequests('Trop de tentatives de connexion. Réessayez dans quelques minutes.')
  }

  const body = req.body as { email?: unknown; password?: unknown }
  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) badRequest('Email et mot de passe requis.')

  const contact = normalizeContact('email', email)
  if (!contact) unauthorized('Identifiants invalides.')

  const user = await userRepository.findByContact(contact)
  if (!user || user.role !== 'admin' || !user.passwordHash) unauthorized('Identifiants invalides.')

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) unauthorized('Identifiants invalides.')

  const token = await createSession(user.id)
  const permissions = await getAdminPermissions(user.id)
  await aiRateLimitService.resetRateLimit(rateKey)

  res.json({ token, user: await userService.toPublicUser(user), permissions, isSuperAdmin: permissions === null })
}

/** POST /api/admin/logout — invalide le jeton Bearer courant. */
export async function adminLogout(req: Request, res: Response): Promise<void> {
  authUser(req) // garde : requireAdminRole a déjà authentifié.
  await destroySession(bearerToken(req))
  res.json({ ok: true })
}

/** GET /api/admin/session — vérifie le jeton au démarrage du dashboard. */
export async function adminSession(req: Request, res: Response): Promise<void> {
  const user = authUser(req)
  const permissions = await getAdminPermissions(user.id)
  res.json({ user: await userService.toPublicUser(user), permissions, isSuperAdmin: permissions === null })
}

/** GET /api/admin/admins — liste des comptes admin + catalogue des permissions (admins.manage). */
export async function listAdmins(req: Request, res: Response): Promise<void> {
  const me = authUser(req)
  const rows = await userRepository.listAdmins()

  const items = rows.map((r) => {
    const perms = parsePermissions(r.adminPermissions)
    return {
      id: r.id,
      contact: r.contact,
      firstName: r.firstName,
      lastName: r.lastName,
      username: r.username,
      createdAt: r.createdAt.getTime(),
      isSuperAdmin: perms === null,
      permissions: perms ?? [],
      isSelf: r.id === me.id,
    }
  })

  res.json({
    items,
    total: items.length,
    catalog: ADMIN_PERMISSIONS.map((key) => ({ key, label: ADMIN_PERMISSION_LABELS[key] })),
  })
}

/** POST /api/admin/admins — crée un admin restreint (jamais super-admin, admins.manage). */
export async function createAdmin(req: Request, res: Response): Promise<void> {
  const body = req.body as { email?: unknown; password?: unknown; firstName?: unknown; lastName?: unknown; permissions?: unknown }
  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : ''

  if (!email || !password) badRequest('Email et mot de passe requis.')
  if (password.length < 8) badRequest('Le mot de passe doit contenir au moins 8 caractères.')

  const contact = normalizeContact('email', email)
  if (!contact) badRequest('Adresse email invalide.')

  const existing = await userRepository.findByContact(contact)
  if (existing) badRequest('Un compte existe déjà avec cet email.')

  const permissions = serializePermissions(body?.permissions)
  const passwordHash = await hashPassword(password)

  const created = await userRepository.createAdmin({
    contact,
    passwordHash,
    adminPermissions: permissions,
    username: (firstName || 'admin').toLowerCase().replace(/\s+/g, '.').slice(0, 24),
    firstName: firstName || 'Admin',
    lastName: lastName || '',
  })

  res.json({
    ok: true,
    admin: {
      id: created.id,
      contact: created.contact,
      firstName: created.firstName,
      lastName: created.lastName,
      createdAt: created.createdAt.getTime(),
      permissions: JSON.parse(permissions) as string[],
    },
  })
}

/** GET /api/admin/team — comptes admin avec leur niveau d'accès (#dashboard-admin, module 12). */
export async function listTeam(_req: Request, res: Response): Promise<void> {
  const rows = await userRepository.listAdmins()
  res.json({ team: rows.map(toUser) })
}

/** POST /api/admin/team/promote — promeut un compte existant au rôle admin (tracé). */
export async function promoteTeamMember(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof promoteAdminSchema>

  const updated = await userRepository.promoteToAdmin(body.userId, body.level)
  await auditLogService.recordAuditLog({ actor: admin, action: 'team.promote', targetType: 'user', targetId: body.userId, metadata: { level: body.level } })
  res.json({ user: toUser(updated) })
}
