// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import chatPostHandler from '~~/server/api/assistant/chat.post'

/**
 * Tests d'intégration HTTP de POST /api/assistant/chat (#geoloc, 2.2) — sans
 * ANTHROPIC_API_KEY dans l'environnement de test, l'assistant fonctionne en
 * mode dégradé (recherche FAQ déterministe, sans appel réseau) : c'est
 * exactement l'état réel de ce projet tant qu'aucune clé n'est fournie, donc
 * la seule route de ce chantier testable de bout en bout sans clé API.
 */
let server: TestServer
const originalApiKey = process.env.ANTHROPIC_API_KEY

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY
  server = await startTestServer([
    { method: 'post', path: '/assistant/chat', handler: chatPostHandler },
  ])
})

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
})

afterAll(async () => {
  if (originalApiKey) process.env.ANTHROPIC_API_KEY = originalApiKey
  await server.close()
})

async function postJson(body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`${server.url}/assistant/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

interface ChatResponse {
  degraded: boolean
  text: string
  toolCalls: unknown[]
}

describe('POST /assistant/chat — mode dégradé (aucune clé IA configurée)', () => {
  it('répond avec degraded: true plutôt qu’une erreur, en s’appuyant sur la FAQ réelle', async () => {
    const { status, json } = await postJson(
      { message: 'Comment contacter un prestataire ?' },
      { 'x-forwarded-for': '10.0.0.1' },
    )
    const body = json as ChatResponse

    expect(status).toBe(200)
    expect(body.degraded).toBe(true)
    expect(body.text).toContain('Comment contacter un prestataire')
  })

  it('reste honnête (pas de contenu inventé) quand la FAQ ne correspond à rien', async () => {
    const { json } = await postJson(
      { message: 'xyz question totalement hors sujet abcdef' },
      { 'x-forwarded-for': '10.0.0.2' },
    )
    const body = json as ChatResponse
    expect(body.degraded).toBe(true)
    expect(body.text).toContain("n'est pas disponible")
  })

  it('rejette un message vide (validation)', async () => {
    const { status } = await postJson({ message: '' }, { 'x-forwarded-for': '10.0.0.3' })
    expect(status).toBe(400)
  })
})

describe('POST /assistant/chat — limitation de débit', () => {
  it('bloque après plusieurs messages rapprochés depuis la même IP', async () => {
    const headers = { 'x-forwarded-for': '10.0.0.99' }
    let lastStatus = 200
    for (let i = 0; i < 10; i++) {
      const { status } = await postJson({ message: `message ${i}` }, headers)
      lastStatus = status
    }
    expect(lastStatus).toBe(429)
  })

  it('n’affecte pas une autre adresse IP', async () => {
    const { status } = await postJson({ message: 'bonjour' }, { 'x-forwarded-for': '10.0.0.100' })
    expect(status).toBe(200)
  })
})
