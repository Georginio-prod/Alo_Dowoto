import type { H3Event } from 'h3'
import type { User } from '~~/server/utils/userStore'

export async function requireSessionUser(event: H3Event): Promise<User> {
  const token = getCookie(event, SESSION_COOKIE)
  const user = await getSessionUser(token)

  if (!user) {
    unauthorized()
  }

  return user
}

/**
 * Exige un utilisateur connecté avec le rôle prestataire — vérification
 * répétée par la plupart des routes /api/providers, /api/subscriptions et
 * /api/payments.
 */
export async function requireProviderRole(event: H3Event): Promise<User> {
  const user = await requireSessionUser(event)
  if (user.role !== 'prestataire') {
    forbidden('Réservé aux comptes prestataire.')
  }
  return user
}

/**
 * Exige un utilisateur connecté avec le rôle client — vérification répétée
 * par les routes /api/quotas/contacts et /api/favorites (#65).
 */
export async function requireClientRole(event: H3Event): Promise<User> {
  const user = await requireSessionUser(event)
  if (user.role !== 'client') {
    forbidden('Réservé aux comptes client.')
  }
  return user
}

/**
 * Exige un utilisateur connecté avec le rôle admin (#dashboard-admin) —
 * vérification côté serveur de chaque route /api/admin/**, jamais seulement
 * un masquage de bouton côté client. `getSessionUser` refuse déjà les
 * sessions dont le compte est suspendu (voir userStore.ts), donc un admin
 * suspendu échoue ici comme n'importe quel utilisateur suspendu.
 */
export async function requireAdminRole(event: H3Event): Promise<User> {
  const user = await requireSessionUser(event)
  if (user.role !== 'admin') {
    forbidden('Réservé à l’équipe WorkTogo.')
  }
  return user
}
