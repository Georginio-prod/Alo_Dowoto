import type { User } from '@prisma/client'
import type { Request } from 'express'
import { prisma } from '../config/prisma'

/** Nom du cookie de session — identique au front/Nitro (`server/utils/userStore.ts`). */
export const SESSION_COOKIE = 'wt_session'

/**
 * Extrait le token de session d'une requête : cookie `wt_session` (site web)
 * OU en-tête `Authorization: Bearer <token>` (dashboard desktop Electron et
 * app mobile, qui n'ont pas de cookie). Iso `server/utils/requireSessionUser.ts`.
 */
export function extractSessionToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined
  if (cookieToken) return cookieToken
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return undefined
}

/**
 * Résout un token en utilisateur — iso `server/utils/userStore.ts:getSessionUser` :
 * session inconnue → `null` ; expirée → supprimée puis `null` ; compte suspendu
 * → traité comme non connecté (vérification serveur, jamais un simple masquage
 * côté client).
 */
export async function getSessionUser(token: string | undefined): Promise<User | null> {
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined)
    return null
  }
  if (session.user.status === 'suspended') return null
  return session.user
}
