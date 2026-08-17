import type { H3Event } from 'h3'
import type { User } from '~~/server/utils/userStore'
import { prisma } from '~~/server/utils/prisma'

/**
 * Permissions granulaires des comptes administrateurs du dashboard desktop
 * (#admin). Un admin peut être « super-administrateur » (accès total, valeur
 * `adminPermissions` NULL en base — cas de l'admin racine créé par
 * scripts/create-admin.mjs) ou restreint à un sous-ensemble de permissions
 * (tableau JSON de clés ci-dessous), créé depuis le dashboard par un admin qui
 * possède `admins.manage`.
 *
 * Rétrocompatibilité : `null`/absent = super-admin. Les comptes admin
 * existants (créés avant cette fonctionnalité) conservent donc l'accès total.
 */

export const ADMIN_PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.edit',
  'users.suspend',
  'users.password',
  'users.delete',
  'providers.view',
  'providers.verify',
  'conversations.view',
  'payments.view',
  'payments.manage',
  'wallet.view',
  'notifications.send',
  'escrow.view',
  'escrow.manage',
  'subscriptions.view',
  'subscriptions.manage',
  'complaints.view',
  'complaints.manage',
  'testimonials.moderate',
  'catalog.view',
  'admins.manage',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

/** Libellés lisibles des permissions, pour l'écran de création d'admin. */
export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  'dashboard.view': "Voir la vue d'ensemble",
  'users.view': 'Voir les utilisateurs',
  'users.edit': 'Modifier un compte',
  'users.suspend': 'Suspendre / réactiver un compte',
  'users.password': 'Réinitialiser un mot de passe',
  'users.delete': 'Supprimer un compte',
  'providers.view': 'Voir les prestataires',
  'providers.verify': 'Valider un prestataire',
  'conversations.view': 'Voir les mises en relation',
  'payments.view': 'Voir les paiements',
  'payments.manage': 'Gérer les paiements (marquer échoué)',
  'wallet.view': 'Voir le portefeuille',
  'notifications.send': 'Envoyer des annonces',
  'escrow.view': 'Voir le séquestre',
  'escrow.manage': 'Arbitrer / rembourser le séquestre',
  'subscriptions.view': 'Voir les abonnements',
  'subscriptions.manage': 'Gérer les abonnements',
  'complaints.view': 'Voir les réclamations',
  'complaints.manage': 'Traiter les réclamations',
  'testimonials.moderate': 'Modérer les témoignages',
  'catalog.view': 'Voir le catalogue des secteurs',
  'admins.manage': 'Gérer les administrateurs',
}

const PERMISSION_SET = new Set<string>(ADMIN_PERMISSIONS)

/**
 * Décode la valeur JSON stockée. Renvoie `null` pour un super-administrateur
 * (champ vide/invalide) — `null` signifie « toutes les permissions ».
 */
export function parsePermissions(raw: string | null | undefined): AdminPermission[] | null {
  if (raw == null || raw === '') return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((p): p is AdminPermission => PERMISSION_SET.has(p))
  } catch {
    return null
  }
}

/** Nettoie une liste reçue du client et la sérialise pour la base. */
export function serializePermissions(list: unknown): string {
  const arr = Array.isArray(list) ? list : []
  const clean = [...new Set(arr.filter((p): p is AdminPermission => PERMISSION_SET.has(String(p))))]
  return JSON.stringify(clean)
}

/** `true` si l'admin possède la permission (super-admin = toujours vrai). */
export function hasPermission(perms: AdminPermission[] | null, key: AdminPermission): boolean {
  return perms === null || perms.includes(key)
}

/** Lit et décode les permissions d'un compte admin depuis la base. */
export async function getAdminPermissions(userId: string): Promise<AdminPermission[] | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { adminPermissions: true },
  })
  return parsePermissions(row?.adminPermissions ?? null)
}

/**
 * Exige un admin connecté possédant la permission `key`. Combine
 * requireAdminRole (auth + rôle admin) et le contrôle granulaire. À utiliser
 * dans les routes /api/admin/** qui exposent une capacité sensible.
 */
export async function requireAdminPermission(event: H3Event, key: AdminPermission): Promise<User> {
  const user = await requireAdminRole(event)
  const perms = await getAdminPermissions(user.id)
  if (!hasPermission(perms, key)) {
    forbidden('Permission insuffisante pour cette action.')
  }
  return user
}
