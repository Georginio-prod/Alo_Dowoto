// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import securityMiddleware from '~~/server/middleware/security'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

/**
 * Vérifie les en-têtes de sécurité HTTP (#354) : posés en toutes
 * circonstances, et la Content-Security-Policy complète (script-src par
 * nonce, pas de `unsafe-inline` hors style-src) uniquement en production —
 * le serveur de dev Vite (HMR) en a besoin, aucun utilisateur final ne le
 * charge. L'injection du nonce dans le HTML rendu (server/plugins/cspNonce.ts,
 * hook `render:html`) n'est pas exercée ici — elle nécessite un rendu Vue/Nuxt
 * complet, hors de portée de ce harnais HTTP minimal (voir la vérification
 * manuelle en build de production dans la description de la PR).
 */
let server: TestServer
const originalNodeEnv = process.env.NODE_ENV

beforeAll(async () => {
  server = await startTestServer(
    [{ method: 'get', path: '/ping', handler: () => 'pong' }],
    [securityMiddleware],
  )
})

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
})

afterAll(async () => {
  await server.close()
})

describe('en-têtes de sécurité (#354)', () => {
  it('pose les en-têtes de durcissement de base quel que soit l’environnement', async () => {
    const response = await fetch(`${server.url}/ping`)

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('permissions-policy')).toContain('geolocation=(self)')
  })

  it('hors production, ne pose qu’une CSP minimale (frame-ancestors) — pas de HSTS', async () => {
    process.env.NODE_ENV = 'test'
    const response = await fetch(`${server.url}/ping`)

    expect(response.headers.get('content-security-policy')).toBe("frame-ancestors 'none'")
    expect(response.headers.get('strict-transport-security')).toBeNull()
  })

  it('en production, pose la CSP complète (default-src self, script-src par nonce) et HSTS', async () => {
    process.env.NODE_ENV = 'production'
    const response = await fetch(`${server.url}/ping`)

    const csp = response.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+'/)
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    // Nominatim (#geoloc) : géocodage appelé depuis le navigateur (AuthContactStep.vue, LocationRadiusPicker.vue).
    expect(csp).toContain('https://nominatim.openstreetmap.org')
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains')
  })

  it('génère un nonce différent à chaque requête', async () => {
    process.env.NODE_ENV = 'production'
    const [first, second] = await Promise.all([fetch(`${server.url}/ping`), fetch(`${server.url}/ping`)])

    const nonceOf = (csp: string | null) => csp?.match(/'nonce-([^']+)'/)?.[1]
    const firstNonce = nonceOf(first.headers.get('content-security-policy'))
    const secondNonce = nonceOf(second.headers.get('content-security-policy'))

    expect(firstNonce).toBeTruthy()
    expect(secondNonce).toBeTruthy()
    expect(firstNonce).not.toBe(secondNonce)
  })
})
