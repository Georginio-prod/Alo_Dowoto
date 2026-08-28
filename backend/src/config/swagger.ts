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
        /** Usage d'un compteur de quota mensuel (`services/quotaService.ts`). `limit` `null` = illimité. */
        QuotaUsage: {
          type: 'object',
          required: ['count', 'month'],
          properties: {
            count: { type: 'integer' },
            limit: { type: 'integer', nullable: true },
            month: { type: 'string', example: '2026-08' },
          },
        },
        /** Mouvement de portefeuille (`repositories/walletMovementRepository.ts`). `amount` toujours positif ; sens selon `type`. */
        WalletMovement: {
          type: 'object',
          required: ['id', 'walletUserId', 'type', 'amount', 'reference', 'createdAt'],
          properties: {
            id: { type: 'string' },
            walletUserId: { type: 'string' },
            type: {
              type: 'string',
              enum: ['recharge', 'escrow_debit', 'escrow_release', 'escrow_refund', 'commission', 'retrait', 'cancellation_compensation', 'dispute_penalty', 'dispute_compensation', 'referral_bonus'],
            },
            amount: { type: 'integer' },
            reference: { type: 'string' },
            counterpartyUserId: { type: 'string', nullable: true },
            createdAt: { type: 'integer', description: 'Horodatage ms (epoch).' },
          },
        },
        /** Paiement d'abonnement Mobile Money (`repositories/paymentRepository.ts`). */
        Payment: {
          type: 'object',
          required: ['id', 'userId', 'subscriptionId', 'provider', 'phone', 'amount', 'status', 'createdAt'],
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            subscriptionId: { type: 'string' },
            provider: { type: 'string', enum: ['flooz', 'tmoney'] },
            phone: { type: 'string' },
            amount: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'failed'] },
            operatorRef: { type: 'string', nullable: true },
            createdAt: { type: 'integer', description: 'Horodatage ms (epoch).' },
            resolvedAt: { type: 'integer', nullable: true },
          },
        },
        /** Recharge mobile money (`repositories/walletRechargeRepository.ts`). */
        WalletRecharge: {
          type: 'object',
          required: ['id', 'userId', 'provider', 'phone', 'amount', 'status', 'createdAt'],
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            provider: { type: 'string', enum: ['flooz', 'tmoney'] },
            phone: { type: 'string' },
            amount: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'failed'] },
            operatorRef: { type: 'string', nullable: true },
            createdAt: { type: 'integer', description: 'Horodatage ms (epoch).' },
            resolvedAt: { type: 'integer', nullable: true },
          },
        },
        /** Avis d'accueil (`services/testimonialService.ts`). `createdAt` en ms epoch. */
        Testimonial: {
          type: 'object',
          required: ['id', 'name', 'role', 'message', 'rating', 'createdAt'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['client', 'prestataire'] },
            message: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            createdAt: { type: 'integer', description: 'Horodatage ms (epoch).' },
          },
        },
      },
    },
  },
  apis: routeGlobs,
})
