// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { upsertProviderProfile } from '~~/server/utils/providerStore'
import { createAuthedUser } from '../setup/httpAuth'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import authPositionDeleteHandler from '~~/server/api/auth/position.delete'
import providerPositionDeleteHandler from '~~/server/api/providers/me/position.delete'

/**
 * Suppression de la position GPS enregistrée (#geoloc, partie 3 — vie
 * privée : « désactiver la géolocalisation à tout moment et supprimer sa
 * position enregistrée »), côté chercheur (compte) et côté prestataire
 * (fiche professionnelle).
 */
let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'delete', path: '/auth/position', handler: authPositionDeleteHandler },
    { method: 'delete', path: '/providers/me/position', handler: providerPositionDeleteHandler },
  ])
})

afterAll(async () => {
  await server.close()
})

async function deleteRequest(path: string, cookieHeader: string) {
  const response = await fetch(`${server.url}${path}`, { method: 'DELETE', headers: { cookie: cookieHeader } })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

describe('DELETE /auth/position', () => {
  it('efface la position GPS du compte connecté', async () => {
    const client = await createAuthedUser('client')
    const { status, json } = await deleteRequest('/auth/position', client.cookieHeader)

    expect(status).toBe(200)
    expect((json as { user: { latitude?: number } }).user.latitude).toBeUndefined()
  })

  it('renvoie 401 sans session', async () => {
    const { status } = await deleteRequest('/auth/position', '')
    expect(status).toBe(401)
  })
})

describe('DELETE /providers/me/position', () => {
  it('efface la position GPS du profil professionnel du prestataire connecté', async () => {
    const provider = await createAuthedUser('prestataire')
    upsertProviderProfile(provider.user.id, { displayName: 'Test', sector: 'menage', latitude: 6.13, longitude: 1.22 })

    const { status, json } = await deleteRequest('/providers/me/position', provider.cookieHeader)

    expect(status).toBe(200)
    expect((json as { profile: { latitude?: number } }).profile.latitude).toBeUndefined()
  })

  it('renvoie 403 pour un compte chercheur (réservé aux prestataires)', async () => {
    const client = await createAuthedUser('client')
    const { status } = await deleteRequest('/providers/me/position', client.cookieHeader)
    expect(status).toBe(403)
  })
})
