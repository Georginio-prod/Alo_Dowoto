// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { upsertProviderProfile } from '~~/server/utils/providerStore'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import searchGetHandler from '~~/server/api/providers/search.get'

/**
 * Tests d'intégration HTTP de GET /providers/search (#geoloc) : filtre par
 * quartier et élargissement automatique du rayon de recherche — la partie
 * ajoutée à cette route par le chantier géolocalisation, en complément de la
 * couverture déjà existante au niveau de searchProviders (providerDirectory.test.ts).
 */
let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'get', path: '/providers/search', handler: searchGetHandler },
  ])
})

afterAll(async () => {
  await server.close()
})

async function getJson(path: string) {
  const response = await fetch(`${server.url}${path}`)
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

interface SearchResponse {
  results: { id: string }[]
  proximity: { requestedRadiusKm: number; usedRadiusKm: number; widened: boolean } | null
}

describe('GET /providers/search — quartier (#geoloc)', () => {
  it('rejette un quartier invalide', async () => {
    const { status } = await getJson('/providers/search?quartier=quartier-inexistant')
    expect(status).toBe(400)
  })

  it('filtre par quartier valide', async () => {
    upsertProviderProfile('http-search-quartier', { displayName: 'Avec Quartier', sector: 'industrie', quartier: 'be' })
    const { status, json } = await getJson('/providers/search?secteur=industrie&quartier=be')
    expect(status).toBe(200)
    expect((json as SearchResponse).results.some((p) => p.id === 'http-search-quartier')).toBe(true)
  })
})

describe('GET /providers/search — élargissement automatique du rayon (#geoloc, 1.3)', () => {
  it('proximity est nul quand aucune coordonnée n’est fournie', async () => {
    const { json } = await getJson('/providers/search?secteur=menage')
    expect((json as SearchResponse).proximity).toBeNull()
  })

  it('signale l’élargissement quand rien n’est trouvé au rayon demandé', async () => {
    upsertProviderProfile('http-search-far', { displayName: 'Loin', sector: 'sante', latitude: 9.5511, longitude: 1.1861 })

    const { json } = await getJson('/providers/search?secteur=sante&lat=6.1319&lng=1.2228&rayon_km=5')
    const body = json as SearchResponse

    expect(body.proximity).not.toBeNull()
    expect(body.proximity?.requestedRadiusKm).toBe(5)
    expect(body.proximity?.widened).toBe(true)
  })

  it('ne signale aucun élargissement quand le rayon demandé suffit déjà', async () => {
    upsertProviderProfile('http-search-near', { displayName: 'Proche', sector: 'commerce', latitude: 6.14, longitude: 1.23 })

    const { json } = await getJson('/providers/search?secteur=commerce&lat=6.1319&lng=1.2228&rayon_km=5')
    const body = json as SearchResponse

    expect(body.results.some((p) => p.id === 'http-search-near')).toBe(true)
    expect(body.proximity?.widened).toBe(false)
    expect(body.proximity?.usedRadiusKm).toBe(5)
  })
})
