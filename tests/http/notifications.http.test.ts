// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findOrCreateConversation, markFirstContactDone } from '~~/server/utils/conversationStore'
import { createAuthedUser } from '../setup/httpAuth'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import messagesPostHandler from '~~/server/api/conversations/[id]/messages.post'
import notificationsGetHandler from '~~/server/api/notifications/index.get'
import notificationsReadPostHandler from '~~/server/api/notifications/read.post'

/**
 * Tests d'intégration HTTP du centre de notifications (#360, premier
 * incrément) : une vraie requête POST /conversations/:id/messages doit
 * déclencher une notification in-app pour l'autre partie, récupérable via
 * GET /notifications — pas juste une vérification au niveau du store
 * (notificationStore.test.ts), mais du chemin complet handler → store.
 */
let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'post', path: '/conversations/:id/messages', handler: messagesPostHandler },
    { method: 'get', path: '/notifications', handler: notificationsGetHandler },
    { method: 'post', path: '/notifications/read', handler: notificationsReadPostHandler },
  ])
})

afterAll(async () => {
  await server.close()
})

async function postJson(path: string, cookieHeader: string, body?: unknown) {
  const response = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookieHeader },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

async function getJson(path: string, cookieHeader: string) {
  const response = await fetch(`${server.url}${path}`, { headers: { cookie: cookieHeader } })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

describe('Notifications de nouveau message (#360)', () => {
  it('le prestataire qui envoie un message notifie le client', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)

    const { status } = await postJson(`/conversations/${conversation.id}/messages`, provider.cookieHeader, { body: 'Je peux passer demain matin.' })
    expect(status).toBe(201)

    const { status: getStatus, json } = await getJson('/notifications', client.cookieHeader)
    expect(getStatus).toBe(200)
    const body = json as { notifications: { title: string; body: string; conversationId: string }[]; unreadCount: number }
    expect(body.unreadCount).toBe(1)
    expect(body.notifications).toHaveLength(1)
    expect(body.notifications[0]?.conversationId).toBe(conversation.id)
    expect(body.notifications[0]?.body).toBe('Je peux passer demain matin.')
  })

  it('le client qui envoie un message notifie le prestataire', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await markFirstContactDone(conversation.id) // contourne le formulaire obligatoire (#129), hors périmètre de ce test

    const { status } = await postJson(`/conversations/${conversation.id}/messages`, client.cookieHeader, { body: 'Bonjour, êtes-vous disponible ?' })
    expect(status).toBe(201)

    const { json } = await getJson('/notifications', provider.cookieHeader)
    const body = json as { unreadCount: number }
    expect(body.unreadCount).toBe(1)
  })

  it("n'envoie aucune notification à l'expéditeur lui-même", async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)

    await postJson(`/conversations/${conversation.id}/messages`, provider.cookieHeader, { body: 'Bonjour' })

    const { json } = await getJson('/notifications', provider.cookieHeader)
    expect((json as { unreadCount: number }).unreadCount).toBe(0)
  })

  it('POST /notifications/read marque tout comme lu', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await postJson(`/conversations/${conversation.id}/messages`, provider.cookieHeader, { body: 'Bonjour' })

    const { status } = await postJson('/notifications/read', client.cookieHeader)
    expect(status).toBe(200)

    const { json } = await getJson('/notifications', client.cookieHeader)
    expect((json as { unreadCount: number }).unreadCount).toBe(0)
  })

  it('renvoie 401 sans session', async () => {
    const { status } = await getJson('/notifications', '')
    expect(status).toBe(401)
  })
})
