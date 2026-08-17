import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { createAndSendCampaign, scheduleCampaign } from '~~/server/utils/adminCampaignStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const campaignSchema = z.object({
  role: z.enum(['client', 'prestataire']).optional(),
  city: z.string().trim().optional(),
  inactiveDays: z.number().int().positive().optional(),
  channel: z.enum(['in_app', 'email', 'sms', 'push']),
  subject: z.string().trim().optional(),
  body: requiredTrimmed('Le message est requis.'),
  scheduledAt: z.number().optional(),
})

function segmentLabel(input: { role?: string, city?: string, inactiveDays?: number }): string {
  const parts: string[] = []
  parts.push(input.role ? (input.role === 'prestataire' ? 'Prestataires' : 'Chercheurs') : 'Tous les comptes')
  if (input.city) parts.push(`ville : ${input.city}`)
  if (input.inactiveDays) parts.push(`inactifs depuis ${input.inactiveDays}j`)
  return parts.join(' · ')
}

/** Crée (et envoie, ou programme) une campagne (#dashboard-admin, module 11). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, campaignSchema)

  const segment = { role: body.role, city: body.city, inactiveDays: body.inactiveDays }
  const label = segmentLabel(body)

  const campaign = body.scheduledAt
    ? await scheduleCampaign({ segment, segmentLabel: label, channel: body.channel, subject: body.subject, body: body.body, createdBy: admin.id, scheduledAt: body.scheduledAt })
    : await createAndSendCampaign({ segment, segmentLabel: label, channel: body.channel, subject: body.subject, body: body.body, createdBy: admin.id })

  await recordAuditLog({ actor: admin, action: body.scheduledAt ? 'campaign.schedule' : 'campaign.send', targetType: 'campaign', targetId: campaign.id, metadata: { segment: label, channel: body.channel } })
  return { campaign }
})
