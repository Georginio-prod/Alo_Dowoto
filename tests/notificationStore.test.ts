import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  countUnreadNotifications,
  createNotification,
  hasUnreadNotificationForConversation,
  listNotifications,
  markAllNotificationsRead,
  notifyNewMessage,
} from '~~/server/utils/notificationStore'
import { findOrCreateUser } from '~~/server/utils/userStore'

function id(): string {
  return randomUUID()
}

async function createRealUser() {
  const { user } = await findOrCreateUser(`+228${Date.now()}${Math.floor(Math.random() * 1e6)}`, 'client', {
    username: `user${id().slice(0, 8)}`,
    firstName: 'Test',
    lastName: 'User',
    location: 'Lomé',
  })
  return user
}

describe('notificationStore (#360, premier incrément — nouveau message)', () => {
  it('createNotification puis listNotifications/countUnreadNotifications', async () => {
    const userId = id()
    await createNotification({ userId, type: 'new_message', title: 'Titre', body: 'Corps', conversationId: id() })

    const list = await listNotifications(userId)
    expect(list).toHaveLength(1)
    expect(list[0]?.title).toBe('Titre')
    expect(list[0]?.readAt).toBeNull()
    expect(await countUnreadNotifications(userId)).toBe(1)
  })

  it('markAllNotificationsRead marque tout comme lu pour cet utilisateur uniquement', async () => {
    const userId = id()
    const other = id()
    await createNotification({ userId, type: 'new_message', title: 'A', body: 'a' })
    await createNotification({ userId, type: 'new_message', title: 'B', body: 'b' })
    await createNotification({ userId: other, type: 'new_message', title: 'C', body: 'c' })

    await markAllNotificationsRead(userId)

    expect(await countUnreadNotifications(userId)).toBe(0)
    expect(await countUnreadNotifications(other)).toBe(1)
    const list = await listNotifications(userId)
    expect(list.every((n) => n.readAt !== null)).toBe(true)
  })

  it('hasUnreadNotificationForConversation distingue par conversation', async () => {
    const userId = id()
    const conversationId = id()
    expect(await hasUnreadNotificationForConversation(userId, conversationId)).toBe(false)

    await createNotification({ userId, type: 'new_message', title: 'A', body: 'a', conversationId })
    expect(await hasUnreadNotificationForConversation(userId, conversationId)).toBe(true)
    expect(await hasUnreadNotificationForConversation(userId, id())).toBe(false)
  })

  it('listNotifications trie du plus récent au plus ancien', async () => {
    const userId = id()
    await createNotification({ userId, type: 'new_message', title: 'Premier', body: 'a' })
    await new Promise((resolve) => setTimeout(resolve, 5))
    await createNotification({ userId, type: 'new_message', title: 'Second', body: 'b' })

    const list = await listNotifications(userId)
    expect(list[0]?.title).toBe('Second')
    expect(list[1]?.title).toBe('Premier')
  })
})

describe('notifyNewMessage (#360)', () => {
  it('crée une notification pour un vrai compte destinataire', async () => {
    const recipient = await createRealUser()
    const conversationId = id()

    await notifyNewMessage({ recipientId: recipient.id, conversationId, senderName: 'Kofi', messageBody: 'Bonjour, disponible demain ?' })

    const list = await listNotifications(recipient.id)
    expect(list).toHaveLength(1)
    expect(list[0]?.title).toBe('Nouveau message de Kofi')
    expect(list[0]?.body).toBe('Bonjour, disponible demain ?')
    expect(list[0]?.conversationId).toBe(conversationId)
  })

  it("tronque l'aperçu du message au-delà de 140 caractères", async () => {
    const recipient = await createRealUser()
    const longMessage = 'x'.repeat(200)

    await notifyNewMessage({ recipientId: recipient.id, conversationId: id(), senderName: 'Kofi', messageBody: longMessage })

    const list = await listNotifications(recipient.id)
    expect(list[0]?.body.length).toBe(141) // 140 caractères + « … »
    expect(list[0]?.body.endsWith('…')).toBe(true)
  })

  it("ne crée aucune notification pour une fiche de l'annuaire de démo (pas un vrai compte)", async () => {
    // Id délibérément hors du format annuaire de démo (`p01`..`p14`, voir
    // providerDirectory.ts) : d'autres tests (requestStoreQuota.test.ts)
    // matérialisent un vrai compte pour certains de ces ids afin de tester
    // le flux d'abonnement — 'p01' n'est donc pas un choix sûr ici.
    const demoProviderId = 'demo-provider-never-a-real-account'
    await notifyNewMessage({ recipientId: demoProviderId, conversationId: id(), senderName: 'Kofi', messageBody: 'Bonjour' })

    expect(await listNotifications(demoProviderId)).toHaveLength(0)
  })

  it('crée une notification à chaque message, même en rafale (débit uniquement email/SMS, pas le in-app)', async () => {
    const recipient = await createRealUser()
    const conversationId = id()

    await notifyNewMessage({ recipientId: recipient.id, conversationId, senderName: 'Kofi', messageBody: 'Premier message' })
    await notifyNewMessage({ recipientId: recipient.id, conversationId, senderName: 'Kofi', messageBody: 'Second message' })
    await notifyNewMessage({ recipientId: recipient.id, conversationId, senderName: 'Kofi', messageBody: 'Troisième message' })

    const list = await listNotifications(recipient.id)
    expect(list).toHaveLength(3)
    expect(list.every((n) => n.readAt === null)).toBe(true)
  })

  it('crée toujours la notification même sans provider email/SMS configuré (environnement de test)', async () => {
    // Aucune variable BREVO_API_KEY/TWILIO_* n'est définie en test : sendEmail/sendSms
    // ne partent pas réellement, mais la notification in-app doit tout de même exister.
    const recipient = await createRealUser()
    await notifyNewMessage({ recipientId: recipient.id, conversationId: id(), senderName: 'Ama', messageBody: 'Salut' })
    expect(await countUnreadNotifications(recipient.id)).toBe(1)
  })
})
