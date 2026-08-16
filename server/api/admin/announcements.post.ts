import { prisma } from '~~/server/utils/prisma'

/**
 * Envoie une annonce (notification in-app) depuis le dashboard
 * (`notifications.send`). Body : `{ target, userId?, title, body }`.
 * `target` ∈ all | clients | prestataires | user (avec `userId`). Crée une
 * notification de type `admin_message` (sans conversation liée) pour chaque
 * destinataire — visible dans le centre de notifications du site/APK. Les
 * comptes administrateurs sont exclus des diffusions de masse.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'notifications.send')

  const body = await readBody<{ target?: unknown; userId?: unknown; title?: unknown; body?: unknown }>(event)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const message = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!title || !message) badRequest('Titre et message requis.')

  const target = body?.target
  let userIds: string[] = []

  if (target === 'user') {
    const uid = typeof body?.userId === 'string' ? body.userId : ''
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { id: true } })
    if (!u) badRequest('Destinataire introuvable.')
    userIds = [u.id]
  } else if (target === 'clients' || target === 'prestataires') {
    const role = target === 'clients' ? 'client' : 'prestataire'
    const rows = await prisma.user.findMany({ where: { role }, select: { id: true } })
    userIds = rows.map((r) => r.id)
  } else if (target === 'all') {
    const rows = await prisma.user.findMany({ where: { role: { in: ['client', 'prestataire'] } }, select: { id: true } })
    userIds = rows.map((r) => r.id)
  } else {
    badRequest('Cible invalide (all, clients, prestataires ou user).')
  }

  if (userIds.length === 0) return { ok: true, sent: 0 }

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type: 'admin_message' as const, title, body: message })),
  })

  return { ok: true, sent: userIds.length }
})
