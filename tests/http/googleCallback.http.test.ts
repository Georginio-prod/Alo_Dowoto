// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { GOOGLE_STATE_COOKIE } from '~~/server/utils/googleAuth'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import googleCallbackHandler from '~~/server/api/auth/google/callback.get'

/**
 * Tests d'intégration HTTP du retour OAuth Google (#261) : l'état
 * anti-CSRF et le refus de consentement sont exercés via de vraies requêtes
 * HTTP (en-têtes `Set-Cookie`/`Location` réels), pas simulés à la main.
 * L'échange du code contre un profil (`fetchGoogleProfile`, appel réseau
 * vers Google) reste hors périmètre de ces tests — non simulable sans
 * compte de test Google réel, cohérent avec le reste de la suite qui évite
 * les dépendances réseau externes.
 */
let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'get', path: '/auth/google/callback', handler: googleCallbackHandler },
  ])
})

afterAll(async () => {
  await server.close()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

async function getCallback(query: string, cookieHeader?: string) {
  const response = await fetch(`${server.url}/auth/google/callback${query}`, {
    redirect: 'manual',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })
  return { status: response.status, location: response.headers.get('location') }
}

describe('GET /auth/google/callback — anti-CSRF et refus (#219)', () => {
  it('redirige vers google_config quand les identifiants OAuth ne sont pas configurés', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '')

    const { status, location } = await getCallback('?code=abc&state=xyz')

    expect(status).toBe(302)
    expect(location).toBe('/auth?error=google_config')
  })

  it('redirige vers google_denied quand Google renvoie une erreur de consentement', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-test')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret-test')

    const { status, location } = await getCallback('?error=access_denied')

    expect(status).toBe(302)
    expect(location).toBe('/auth?error=google_denied')
  })

  it('redirige vers google_state quand le state renvoyé par Google ne correspond pas au cookie posé avant redirection (anti-CSRF)', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-test')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret-test')

    const { status, location } = await getCallback(
      '?code=abc&state=state-recu-de-google',
      `${GOOGLE_STATE_COOKIE}=state-different-pose-avant-redirection`,
    )

    expect(status).toBe(302)
    expect(location).toBe('/auth?error=google_state')
  })

  it('redirige vers google_state quand aucun cookie d’état n’a été posé (état manquant)', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-test')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret-test')

    const { status, location } = await getCallback('?code=abc&state=state-recu-de-google')

    expect(status).toBe(302)
    expect(location).toBe('/auth?error=google_state')
  })

  it('redirige vers google_state quand code ou state est manquant dans la requête', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-test')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret-test')

    const { status, location } = await getCallback('?state=state-abc', `${GOOGLE_STATE_COOKIE}=state-abc`)

    expect(status).toBe(302)
    expect(location).toBe('/auth?error=google_state')
  })
})
