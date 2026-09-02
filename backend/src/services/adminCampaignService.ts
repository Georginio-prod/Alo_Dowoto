import { prisma } from '../config/prisma'
import { notificationRepository } from '../repositories/notificationRepository'

/**
 * Campagnes de notification (#dashboard-admin, module 11), portées iso depuis
 * `server/utils/adminCampaignStore.ts` (ADR-0017) — le canal `in_app` crée
 * réellement une ligne Notification (via `notificationRepository`) pour chaque
 * destinataire du segment résolu ; `email`/`sms`/`push` sont enregistrés
 * (traçabilité) mais non délivrés — aucun fournisseur externe de campagne n'est
 * intégré dans ce lot. Le taux d'ouverture (`openCount`) reste à 0, faute de
 * suivi de lecture pour les campagnes.
 */

export interface SegmentFilter {
  role?: 'client' | 'prestataire'
  city?: string
  inactiveDays?: number
}

async function resolveSegment(segment: SegmentFilter): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      ...(segment.role ? { role: segment.role } : {}),
      ...(segment.city ? { location: { contains: segment.city } } : {}),
      status: 'active',
    },
    select: { id: true },
  })

  if (!segment.inactiveDays) return rows.map((r) => r.id)

  const cutoff = new Date(Date.now() - segment.inactiveDays * 24 * 60 * 60 * 1000)
  const active = await prisma.session.findMany({ where: { createdAt: { gte: cutoff } }, select: { userId: true } })
  const activeIds = new Set(active.map((s) => s.userId))
  return rows.map((r) => r.id).filter((id) => !activeIds.has(id))
}

export interface CreateCampaignInput {
  segment: SegmentFilter
  segmentLabel: string
  channel: 'in_app' | 'email' | 'sms' | 'push'
  subject?: string
  body: string
  createdBy: string
}

export async function createAndSendCampaign(input: CreateCampaignInput) {
  const recipientIds = await resolveSegment(input.segment)

  if (input.channel === 'in_app') {
    await Promise.all(recipientIds.map((userId) =>
      notificationRepository.create({ userId, type: 'admin_message', title: input.subject ?? 'WorkTogo', body: input.body }),
    ))
  }
  // email/sms/push : recipientCount reflète le segment résolu, mais aucune
  // livraison n'est effectuée (pas de fournisseur externe de campagne).

  return prisma.notificationCampaign.create({
    data: {
      segment: input.segmentLabel,
      channel: input.channel,
      subject: input.subject ?? null,
      body: input.body,
      sentAt: new Date(),
      recipientCount: recipientIds.length,
      createdBy: input.createdBy,
    },
  })
}

export interface ScheduleCampaignInput extends CreateCampaignInput {
  scheduledAt: number
}

/** Programme une campagne — enregistrée avec `scheduledAt`, pas encore envoyée (aucun ordonnanceur n'exécute les envois différés dans ce lot). */
export async function scheduleCampaign(input: ScheduleCampaignInput) {
  const recipientIds = await resolveSegment(input.segment)
  return prisma.notificationCampaign.create({
    data: {
      segment: input.segmentLabel,
      channel: input.channel,
      subject: input.subject ?? null,
      body: input.body,
      scheduledAt: new Date(input.scheduledAt),
      recipientCount: recipientIds.length,
      createdBy: input.createdBy,
    },
  })
}

export async function listCampaigns() {
  return prisma.notificationCampaign.findMany({ orderBy: { createdAt: 'desc' } })
}
