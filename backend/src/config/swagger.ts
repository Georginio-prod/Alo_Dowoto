import path from 'node:path'
import swaggerJsdoc from 'swagger-jsdoc'
import { env } from './env'

/**
 * Spécification OpenAPI du backend, construite par `swagger-jsdoc` à partir des
 * annotations `@openapi` posées en JSDoc au-dessus des routes
 * (`src/routes/**\/*.routes.ts`). Chaque domaine porté en Phase 2 documente ses
 * routes localement ; la doc reste ainsi **au plus près du code** et ne dérive
 * pas.
 *
 * Les composants transverses (schéma d'erreur au format Nitro, schémas de
 * sécurité cookie/Bearer) sont définis ici une fois pour toutes et référencés
 * par `$ref` dans les annotations de route.
 */
const routeGlobs = [
  // Résout en dev (tsx → src/*.ts) comme en prod (tsc → dist/*.js). `glob`
  // exige des séparateurs POSIX même sous Windows (un `\` y est un échappement),
  // d'où la normalisation en slashes.
  path.resolve(__dirname, '../routes/**/*.routes.{ts,js}').replace(/\\/g, '/'),
]

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'API Alo_Dowoto (WorkTogo)',
      version: '0.0.0',
      description:
        "API Express d'Alo_Dowoto. Les réponses d'erreur suivent le format Nitro "
        + 'historique `{ error, statusCode, message, data }` (ADR-0016), garanti '
        + 'iso par les tests de contrat.',
    },
    servers: [
      // Same-origin derrière le reverse proxy `/api/* → backend` (ADR-0017).
      { url: '/api', description: 'Via le reverse proxy (web same-origin)' },
      {
        url: `http://localhost:${env.port}`,
        description: 'Backend en direct (dashboard/mobile, Bearer)',
      },
    ],
    components: {
      securitySchemes: {
        // Site web : cookie de session same-origin.
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'wt_session' },
        // Dashboard desktop (Electron) et app mobile : jeton porteur.
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
      schemas: {
        /** Forme exacte sérialisée par `middleware/errorHandler.ts`. */
        Error: {
          type: 'object',
          required: ['error', 'statusCode', 'message'],
          properties: {
            error: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Requête invalide.' },
            data: { type: 'object', additionalProperties: true, nullable: true },
          },
        },
      },
    },
  },
  apis: routeGlobs,
})
