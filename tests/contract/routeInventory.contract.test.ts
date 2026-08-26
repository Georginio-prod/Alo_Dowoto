// @vitest-environment node
//
// Inventaire de contrat : capture la surface HTTP complète de l'API Nitro
// actuelle. Cet instantané est la référence « avant » du chantier d'extraction
// vers Express — toute route ajoutée, retirée ou renommée fait échouer le test
// et doit donc être une décision consciente (ADR-0016).
import { describe, expect, it } from 'vitest'
import { discoverApiRoutes } from './loadApiRoutes'

describe('Contrat — inventaire des routes API (surface HTTP à préserver)', () => {
  const routes = discoverApiRoutes()

  it('découvre l’ensemble des routes server/api/** (garde-fou de surface)', () => {
    // 183 routes au moment de la capture initiale ; le seuil protège contre une
    // découverte cassée (glob vide) sans devenir fragile à chaque ajout.
    expect(routes.length).toBeGreaterThanOrEqual(180)
  })

  it('correspond à l’instantané de contrat — toute route ajoutée/retirée doit être revue', () => {
    const manifest = routes.map((r) => `${r.method.toUpperCase().padEnd(6)} ${r.routePath}`)
    expect(manifest).toMatchSnapshot()
  })
})
