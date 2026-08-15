import type { H3Event } from 'h3'
import type { User } from '~~/server/utils/userStore'

/**
 * Résout l'utilisateur authentifié depuis le cookie de session (site web) OU
 * un en-tête `Authorization: Bearer <token>` — ce dernier est utilisé par le
 * dashboard admin desktop (Electron), qui appelle l'API depuis son process
 * principal (Node) et ne gère donc pas de cookies. Le jeton Bearer est un
 * jeton de session normal (server/utils/userStore.ts) : aucune nouvelle
 * mécanique de session à maintenir.
 */
export async function getAuthUser(event: H3Event): Promise<User | null> {
  const cookieToken = getCookie(event, SESSION_COOKIE)
  let token = cookieToken

  if (!token) {
    const header = getHeader(event, 'authorization')
    if (header && header.startsWith('Bearer ')) {
      token = header.slice('Bearer '.length).trim()
    }
  }

  return getSessionUser(token)
}

/**
 * Exige un utilisateur connecté avec le rôle administrateur — vérification
 * partagée par toutes les routes /api/admin/**. Les comptes admin ne sont
 * jamais créés via l'inscription publique (voir scripts/create-admin.mjs).
 */
export async function requireAdminRole(event: H3Event): Promise<User> {
  const user = await getAuthUser(event)
  if (!user) {
    unauthorized()
  }
  // `User.role` reste volontairement typé `Role` (client|prestataire) pour ne
  // pas propager `admin` aux types de messages/témoignages ; en base le rôle
  // peut valoir `admin`, d'où ce cast local (voir userStore.ts:AccountRole).
  if ((user.role as string) !== 'admin') {
    forbidden('Réservé aux administrateurs.')
  }
  return user
}
