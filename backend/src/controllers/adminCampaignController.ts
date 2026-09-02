import type { Request, Response } from 'express'
import type { z } from 'zod'
import { authUser } from '../utils/authUser'
import { createAndSendCampaign, listCampaigns, listMessageTemplates, scheduleCampaign, upsertMessageTemplate } from '../services/adminCampaignService'
import { auditLogService } from '../services/auditLogService'
import type { campaignSchema, messageTemplateSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — module 11 : campagnes de notification et modèles de
 * messages automatiques. Portées iso depuis `server/api/admin/{campaigns,templates}/**`
 * (ADR-0017) : historique et création (envoi immédiat ou programmé) d'une
 * campagne ciblée sur un segment, plus la gestion des modèles réutilisables.
 */

/** Libellé lisible du segment ciblé (iso `segmentLabel` Nitro). */
function segmentLabel(input: { role?: string; city?: string; inactiveDays?: number }): string {
  const parts: string[] = []
  parts.push(input.role ? (input.role === 'prestataire' ? 'Prestataires' : 'Chercheurs') : 'Tous les comptes')
  if (input.city) parts.push(`ville : ${input.city}`)
  if (input.inactiveDays) parts.push(`inactifs depuis ${input.inactiveDays}j`)
  return parts.join(' · ')
}

/** GET /api/admin/campaigns — historique des campagnes (rôle admin). */
export async function adminListCampaigns(_req: Request, res: Response): Promise<void> {
  res.json({ campaigns: await listCampaigns() })
}

/** POST /api/admin/campaigns — crée (et envoie, ou programme) une campagne (rôle admin, tracé). */
export async function adminCreateCampaign(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof campaignSchema>

  const segment = { role: body.role, city: body.city, inactiveDays: body.inactiveDays }
  const label = segmentLabel(body)

  const campaign = body.scheduledAt
    ? await scheduleCampaign({ segment, segmentLabel: label, channel: body.channel, subject: body.subject, body: body.body, createdBy: admin.id, scheduledAt: body.scheduledAt })
    : await createAndSendCampaign({ segment, segmentLabel: label, channel: body.channel, subject: body.subject, body: body.body, createdBy: admin.id })

  await auditLogService.recordAuditLog({
    actor: admin,
    action: body.scheduledAt ? 'campaign.schedule' : 'campaign.send',
    targetType: 'campaign',
    targetId: campaign.id,
    metadata: { segment: label, channel: body.channel },
  })
  res.json({ campaign })
}

/** GET /api/admin/templates — modèles de messages automatiques (rôle admin). */
export async function adminListTemplates(_req: Request, res: Response): Promise<void> {
  res.json({ templates: await listMessageTemplates() })
}

/** POST /api/admin/templates — crée ou met à jour un modèle de message automatique (rôle admin, tracé). */
export async function adminUpsertTemplate(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof messageTemplateSchema>

  const template = await upsertMessageTemplate(body.key, body.label, body.channel, body.body, body.subject)
  await auditLogService.recordAuditLog({ actor: admin, action: 'template.upsert', targetType: 'message_template', targetId: body.key })
  res.json({ template })
}
