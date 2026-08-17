import { prisma } from '~~/server/utils/prisma'
import { getUserById } from '~~/server/utils/userStore'
import { resolveProviderIdentity } from '~~/server/utils/adminProviderResolve'

/**
 * Détail d'une mise en relation (`conversations.view`) : informations
 * COMPLÈTES du client (compte User) et du prestataire (annuaire) — localisation,
 * photo, coordonnées — plus le fil de messages échangés. Lecture seule.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'conversations.view')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant de conversation manquant.')

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, clientId: true, providerId: true, firstContactDone: true, clientContact: true, createdAt: true },
  })
  if (!conv) notFound('Conversation introuvable.')

  const client = await getUserById(conv.clientId)
  const provider = await resolveProviderIdentity(conv.providerId)

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: { id: true, senderRole: true, body: true, kind: true, locationLat: true, locationLng: true, createdAt: true },
  })

  return {
    id: conv.id,
    firstContactDone: conv.firstContactDone,
    clientContact: conv.clientContact,
    createdAt: conv.createdAt.getTime(),
    client: client
      ? {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`.trim() || client.username || client.contact,
          username: client.username,
          contact: client.contact,
          city: client.location,
          latitude: client.latitude ?? null,
          longitude: client.longitude ?? null,
          createdAt: client.createdAt,
        }
      : { id: conv.clientId, name: 'Compte supprimé', missing: true },
    provider: {
      id: provider.id,
      name: provider.name,
      contact: provider.contact,
      sector: provider.sector,
      city: provider.city,
      photoUrl: provider.photoUrl,
      latitude: provider.latitude,
      longitude: provider.longitude,
      isRealAccount: provider.isRealAccount,
      missing: provider.missing ?? false,
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      body: m.body,
      kind: m.kind,
      locationLat: m.locationLat,
      locationLng: m.locationLng,
      createdAt: m.createdAt.getTime(),
    })),
  }
})
