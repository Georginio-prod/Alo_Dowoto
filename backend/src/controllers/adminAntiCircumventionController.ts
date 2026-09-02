import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import {
  getDemoBrowseWithoutPaySignals,
  listContournementSignals,
  listMissionDropSignals,
  listProviderRiskScores,
  markFalsePositive,
} from '../services/adminAntiCircumventionService'
import { setMessagingRestricted } from '../services/adminUserActionsService'
import { sendAdminMessage } from '../services/adminMessagingService'
import { auditLogService } from '../services/auditLogService'
import type { antiCircumventionFalsePositiveSchema, antiCircumventionRestrictSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — module 9 : anti-désintermédiation. Portées iso
 * depuis `server/api/admin/anti-circumvention/**` (ADR-0017) : tableau de bord
 * des signaux, avertissement, restriction de messagerie et marquage faux positif.
 * Chaque action mutante est tracée au journal d'audit.
 */

/** GET /api/admin/anti-circumvention — tableau de bord des signaux (rôle admin). */
export async function adminAntiCircumventionDashboard(_req: Request, res: Response): Promise<void> {
  const [signals, missionDrops, riskScores] = await Promise.all([
    listContournementSignals(),
    listMissionDropSignals(),
    listProviderRiskScores(),
  ])
  res.json({ signals, missionDrops, riskScores, browseWithoutPaySignals: getDemoBrowseWithoutPaySignals() })
}

/** POST /api/admin/anti-circumvention/:userId/warn — envoie un avertissement anti-désintermédiation (rôle admin, tracé). */
export async function adminAntiCircumventionWarn(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const userId = req.params.userId
  if (!userId) badRequest('Identifiant requis.')

  await sendAdminMessage(
    userId,
    'Avertissement WorkTogo',
    "Nous avons détecté des tentatives d'échange de coordonnées en dehors de la plateforme. Toute prestation doit être conclue et payée via WorkTogo, sous peine de restriction ou de suspension du compte.",
  )
  await auditLogService.recordAuditLog({ actor: admin, action: 'anti_circumvention.warn', targetType: 'user', targetId: userId })
  res.json({ ok: true })
}

/** POST /api/admin/anti-circumvention/:userId/restrict-messaging — (dé)restreint la messagerie d'un compte (rôle admin, tracé). */
export async function adminAntiCircumventionRestrictMessaging(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const userId = req.params.userId
  if (!userId) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof antiCircumventionRestrictSchema>

  const user = await setMessagingRestricted(userId, body.restricted)
  await auditLogService.recordAuditLog({ actor: admin, action: body.restricted ? 'anti_circumvention.restrict' : 'anti_circumvention.unrestrict', targetType: 'user', targetId: userId })
  res.json({ user })
}

/** POST /api/admin/anti-circumvention/:userId/false-positive — marque un signal comme faux positif (rôle admin, tracé). */
export async function adminAntiCircumventionFalsePositive(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const userId = req.params.userId
  if (!userId) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof antiCircumventionFalsePositiveSchema>

  await markFalsePositive(userId, admin.id, body.note)
  await auditLogService.recordAuditLog({ actor: admin, action: 'anti_circumvention.false_positive', targetType: 'user', targetId: userId })
  res.json({ ok: true })
}
