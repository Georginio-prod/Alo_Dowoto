// @vitest-environment node
//
// Capture comportementale de référence + garde-fou de chargement. On fige
// statut + corps de réponse : instantané « avant » du chantier d'extraction,
// rejoué plus tard contre le backend Express pour garantir le zéro changement.
//
// Léger volontairement : la vérification « tous les handlers chargent » se fait
// par import seul (aucun serveur), et l'instantané ne monte QUE la route testée
// — pour ne pas saturer le runner CI en parallèle (le montage complet des 183
// routes est réservé au rejeu, voir contractServer.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sectorsCountsHandler from '~~/server/api/sectors/counts.get'
import { loadAllHandlers } from './loadApiRoutes'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'get', path: '/api/sectors/counts', handler: sectorsCountsHandler },
  ])
})

afterAll(async () => {
  await server?.close()
})

describe('Contrat — chargement des handlers', () => {
  it('tous les handlers server/api/** s’importent sans erreur', async () => {
    const { routeCount, loadErrors } = await loadAllHandlers()
    expect(loadErrors).toEqual([])
    expect(routeCount).toBeGreaterThanOrEqual(180)
  }, 20_000)
})

describe('Contrat — capture comportementale', () => {
  it('GET /api/sectors/counts — instantané de la réponse publique (statut + corps)', async () => {
    const res = await fetch(`${server.url}/api/sectors/counts`)
    const body = await res.json()
    expect({ status: res.status, body }).toMatchSnapshot()
  })
})
