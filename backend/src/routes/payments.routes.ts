import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser, requireProviderRole } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { initiatePaymentSchema } from '../validation/schemas/payments'
import { initiatePayment, getMyPayments, getPayment, getPaymentReceipt, paymentWebhook } from '../controllers/paymentController'

/**
 * Paiement d'abonnement Mobile Money (#34), porté depuis `server/api/payments/**`
 * (Phase 2, ADR-0017). Monté sous `/api` → chemins iso Nitro. Le webhook est
 * public (signature HMAC) ; initiate/me exigent le rôle prestataire ; le reçu PDF
 * (#363) est réservé au titulaire.
 */
export const paymentsRoutes = Router()

/**
 * @openapi
 * /payments/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Initier le paiement d'un abonnement en attente (Mobile Money)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, phone]
 *             properties:
 *               subscriptionId: { type: string }
 *               provider: { type: string, enum: [flooz, tmoney] }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Paiement créé (statut `pending`).
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { payment: { $ref: '#/components/schemas/Payment' } } }
 *       400: { description: Corps/numéro/formule invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux prestataires., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Abonnement introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: Abonnement déjà actif., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
paymentsRoutes.post('/payments/initiate', requireProviderRole, validateBody(initiatePaymentSchema), asyncHandler(initiatePayment))

/**
 * @openapi
 * /payments/me:
 *   get:
 *     tags: [Payments]
 *     summary: Paiements confirmés + formule courante du prestataire connecté
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Historique des paiements confirmés + formule (ou null).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments: { type: array, items: { $ref: '#/components/schemas/Payment' } }
 *                 plan: { type: string, nullable: true }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux prestataires., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
paymentsRoutes.get('/payments/me', requireProviderRole, asyncHandler(getMyPayments))

/**
 * @openapi
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Statut d'un paiement (polling pendant la confirmation)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paiement.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { payment: { $ref: '#/components/schemas/Payment' } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Paiement introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
paymentsRoutes.get('/payments/:id', requireSessionUser, asyncHandler(getPayment))

/**
 * @openapi
 * /payments/{id}/receipt:
 *   get:
 *     tags: [Payments]
 *     summary: Reçu PDF d'un paiement d'abonnement confirmé (#363)
 *     description: Réservé au titulaire du paiement. Aucun reçu pour un paiement non confirmé. La langue du document suit `?locale=fr|en`.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         required: false
 *         schema: { type: string, enum: [fr, en] }
 *     responses:
 *       200:
 *         description: Document PDF (téléchargement).
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       400: { description: Paiement non confirmé., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Paiement ou abonnement introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
paymentsRoutes.get('/payments/:id/receipt', requireSessionUser, asyncHandler(getPaymentReceipt))

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Webhook opérateur — confirmation d'un paiement (signature HMAC)
 *     description: Public, authentifié par `x-webhook-signature` (HMAC-SHA256 du corps brut) et protégé contre le rejeu (timestamp + nonce). À la confirmation, active l'abonnement et récompense un éventuel parrainage.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId, status, timestamp, nonce]
 *             properties:
 *               paymentId: { type: string }
 *               status: { type: string, enum: [success, failed] }
 *               operatorRef: { type: string }
 *               timestamp: { type: integer }
 *               nonce: { type: string }
 *     responses:
 *       200:
 *         description: Paiement résolu (ou état courant si déjà résolu).
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { payment: { $ref: '#/components/schemas/Payment' } } }
 *       400: { description: Corps webhook invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Signature invalide (ou rejeu)., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Paiement introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
paymentsRoutes.post('/payments/webhook', asyncHandler(paymentWebhook))
