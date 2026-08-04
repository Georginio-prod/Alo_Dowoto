import { describe, expect, it } from 'vitest'
import { buildProductionCsp, TRUSTED_IMAGE_SRC } from '~~/server/middleware/security'

/**
 * Durcissement `img-src` (audit F1). Le `https:` générique autorisait
 * l'affichage d'images depuis n'importe quel hôte (vecteur de pistage/SSRF) ;
 * il est remplacé par une allow-list explicite. Les avatars et pièces de
 * vérification étant des data URI, la seule image tierce réellement chargée est
 * la tuile de carte OpenStreetMap (Leaflet, #263).
 */
describe('CSP img-src — allow-list (F1)', () => {
  it("n'autorise plus le wildcard https: générique", () => {
    expect(TRUSTED_IMAGE_SRC).not.toContain('https:')
    const csp = buildProductionCsp('nonce123')
    const imgSrc = csp.split('; ').find((d) => d.startsWith('img-src '))
    expect(imgSrc).toBeDefined()
    expect(imgSrc).not.toMatch(/(^|\s)https:(\s|$)/)
  })

  it('autorise self, les data URI et les tuiles OpenStreetMap', () => {
    const csp = buildProductionCsp('nonce123')
    expect(csp).toContain("img-src 'self' data: https://*.tile.openstreetmap.org")
  })

  it('injecte le nonce de requête dans script-src', () => {
    const csp = buildProductionCsp('abc123')
    expect(csp).toContain("script-src 'self' 'nonce-abc123'")
  })

  it('conserve les directives de durcissement clés', () => {
    const csp = buildProductionCsp('n')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("default-src 'self'")
  })
})
