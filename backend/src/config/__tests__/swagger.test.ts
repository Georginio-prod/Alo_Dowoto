import { describe, expect, it } from 'vitest'
import { swaggerSpec } from '../swagger'

/**
 * La spec OpenAPI se construit et porte les composants transverses (schéma
 * d'erreur au format Nitro, sécurité cookie + Bearer), et `swagger-jsdoc`
 * récolte bien les annotations `@openapi` des routes (gabarit : /health).
 */
describe('Spécification OpenAPI', () => {
  const spec = swaggerSpec as {
    openapi: string
    info: { title: string }
    components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> }
    paths: Record<string, unknown>
  }

  it('expose une spec OpenAPI 3 valide', () => {
    expect(spec.openapi).toMatch(/^3\./)
    expect(spec.info.title).toContain('Alo_Dowoto')
  })

  it('définit le schéma d’erreur au format Nitro', () => {
    expect(spec.components.schemas).toHaveProperty('Error')
  })

  it('définit les deux schémas de sécurité (cookie + Bearer)', () => {
    expect(spec.components.securitySchemes).toHaveProperty('cookieAuth')
    expect(spec.components.securitySchemes).toHaveProperty('bearerAuth')
  })

  it('récolte les annotations @openapi des routes (/health)', () => {
    expect(spec.paths).toHaveProperty('/health')
    expect(spec.paths).toHaveProperty('/health/db')
  })
})
