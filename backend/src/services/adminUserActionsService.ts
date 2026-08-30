import { prisma } from '../config/prisma'
import { toUser, type AdminUserView } from './userService'

/**
 * Actions admin sur le cycle de vie d'un compte (#dashboard-admin), portées iso
 * depuis `server/utils/userStore.ts` (ADR-0017) : suspension (statut +
 * horodatage + motif + invalidation des sessions), réactivation, marquage « à
 * risque ». Toutes renvoient la projection `toUser` (AdminUserView, horodatages
 * en ms).
 */

/** Suspend un compte : statut `suspended`, motif tracé, sessions actives coupées. */
export async function suspendUser(userId: string, reason: string): Promise<AdminUserView> {
  const row = await prisma.user.update({
    where: { id: userId },
    data: { status: 'suspended', suspendedAt: new Date(), suspendedReason: reason },
  })
  await prisma.session.deleteMany({ where: { userId } })
  return toUser(row)
}

/** Réactive un compte suspendu : statut `active`, horodatage et motif effacés. */
export async function reactivateUser(userId: string): Promise<AdminUserView> {
  const row = await prisma.user.update({
    where: { id: userId },
    data: { status: 'active', suspendedAt: null, suspendedReason: null },
  })
  return toUser(row)
}

/** Marque (ou retire) un compte comme « à risque », avec note interne facultative. */
export async function setUserRiskFlag(userId: string, riskFlag: boolean, note?: string): Promise<AdminUserView> {
  const row = await prisma.user.update({
    where: { id: userId },
    data: { riskFlag, riskNote: note ?? null },
  })
  return toUser(row)
}
