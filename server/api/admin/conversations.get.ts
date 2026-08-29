import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { getUserById } from '~~/server/utils/userStore'
import { resolveProviderIdentity } from '~~/server/utils/adminProviderResolve'

/**
 * Mises en relation client ↔ prestataire (`conversations.view`) : liste paginée
 * des conversations, chaque ligne résolvant le client (vrai compte User :
 * nom, contact, ville) et le prestataire (annuaire providerDirectory :
 * displayName, secteur, ville, photo, note). Recherche sur le client (nom,
 * contact, ville). Lecture seule.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'conversations.view')

  const params = readAdminListParams(event)

  const where: Prisma.ConversationWhereInput = {}
  if (params.search) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
          { contact: { contains: params.search, mode: 'insensitive' } },
          { location: { contains: params.search, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    })
    where.clientId = { in: users.map((u) => u.id) }
  }

  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        clientId: true,
        providerId: true,
        firstContactDone: true,
        createdAt: true,
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ])

  const items = await Promise.all(
    rows.map(async (r) => {
      const client = await getUserById(r.clientId)
      const provider = await resolveProviderIdentity(r.providerId)
      return {
        id: r.id,
        firstContactDone: r.firstContactDone,
        createdAt: r.createdAt.getTime(),
        messageCount: r._count.messages,
        lastMessageAt: r.messages[0]?.createdAt.getTime() ?? null,
        client: client
          ? {
              id: client.id,
              name: `${client.firstName} ${client.lastName}`.trim() || client.username || client.contact,
              contact: client.contact,
              city: client.location,
            }
          : { id: r.clientId, name: 'Compte supprimé', contact: null, city: null, missing: true },
        provider: {
          id: provider.id,
          name: provider.name,
          sector: provider.sector,
          city: provider.city,
          photoUrl: provider.photoUrl,
          isRealAccount: provider.isRealAccount,
          missing: provider.missing ?? false,
        },
      }
    }),
  )

  return paginated(items, total, params)
})
