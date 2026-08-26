// @vitest-environment node
//
// Capture comportementale de référence : l'application Nitro complète est
// montée derrière un vrai serveur HTTP, et l'on fige statut + corps de réponse.
// Ces instantanés sont la preuve « avant » du chantier d'extraction — ils
// seront rejoués contre le backend Express pour garantir le zéro changement.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startContractServer, type ContractServer } from './contractServer'

let server: ContractServer

beforeAll(async () => {
  server = await startContractServer()
})

afterAll(async () => {
  await server?.close()
})

describe('Contrat — l’API Nitro monte et répond', () => {
  it('charge tous les handlers server/api/** sans erreur d’import', () => {
    // Si un handler n'est pas importable isolément, il apparaît ici nommé —
    // à corriger avant de le porter vers Express.
    expect(server.loadErrors).toEqual([])
    expect(server.routeCount).toBeGreaterThanOrEqual(180)
  })

  it('GET /api/sectors/counts — instantané de la réponse publique (statut + corps)', async () => {
    const res = await fetch(`${server.url}/api/sectors/counts`)
    const body = await res.json()
    expect({ status: res.status, body }).toMatchSnapshot()
  })
})
