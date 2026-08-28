import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser, requireProviderRole } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { walletRechargeSchema, walletWithdrawSchema } from '../validation/schemas/wallet'
import { getMyWallet, createRecharge, getRecharge, getMovementReceipt, withdraw, walletWebhook } from '../controllers/walletController'

/**
 * Portefeuille interne (#192/#193), porté depuis `server/api/wallet/**` (Phase 2,
 * ADR-0017). Monté sous `/api` → chemins iso Nitro. Le webhook opérateur est
 * public (authentifié par signature HMAC) ; les autres routes exigent une
 * session (retrait : rôle prestataire ; reçu PDF #363 : titulaire du mouvement).
 */
export const walletRoutes = Router()

/**
 * @openapi
 * /wallet/me:
 *   get:
 *     tags: [Wallet]
 *     summary: Solde, mouvements et retrait minimum du compte connecté
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Solde courant, journal des mouvements, retrait minimum.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance: { type: integer }
 *                 movements: { type: array, items: { $ref: '#/components/schemas/WalletMovement' } }
 *                 minWithdrawal: { type: integer, example: 5000 }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
walletRoutes.get('/wallet/me', requireSessionUser, asyncHandler(getMyWallet))

/**
 * @openapi
 * /wallet/recharge:
 *   post:
 *     tags: [Wallet]
 *     summary: Créer une recharge mobile money (confirmée par webhook opérateur)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, phone, amount]
 *             properties:
 *               provider: { type: string, enum: [flooz, tmoney] }
 *               phone: { type: string }
 *               amount: { type: integer, minimum: 500 }
 *     responses:
 *       200:
 *         description: Recharge créée (statut `pending`).
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { recharge: { $ref: '#/components/schemas/WalletRecharge' } } }
 *       400: { description: Corps invalide — erreur au format Nitro., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
walletRoutes.post('/wallet/recharge', requireSessionUser, validateBody(walletRechargeSchema), asyncHandler(createRecharge))

/**
 * @openapi
 * /wallet/recharge/{id}:
 *   get:
 *     tags: [Wallet]
 *     summary: Statut d'une recharge (polling pendant la confirmation)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Recharge.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { recharge: { $ref: '#/components/schemas/WalletRecharge' } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Recharge introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
walletRoutes.get('/wallet/recharge/:id', requireSessionUser, asyncHandler(getRecharge))

/**
 * @openapi
 * /wallet/withdraw:
 *   post:
 *     tags: [Wallet]
 *     summary: Demande de retrait prestataire vers son moyen de paiement
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [amount], properties: { amount: { type: integer } } }
 *     responses:
 *       200:
 *         description: Retrait débité.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { movement: { $ref: '#/components/schemas/WalletMovement' } } }
 *       400: { description: Moyen de retrait manquant ou montant sous le minimum., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       402: { description: Solde insuffisant., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux prestataires., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
walletRoutes.post('/wallet/withdraw', requireProviderRole, validateBody(walletWithdrawSchema), asyncHandler(withdraw))

/**
 * @openapi
 * /wallet/movements/{id}/receipt:
 *   get:
 *     tags: [Wallet]
 *     summary: Reçu PDF d'un mouvement d'escrow (#363)
 *     description: Réservé au titulaire du mouvement, et seulement pour un débit ou une libération de séquestre. La langue suit `?locale=fr|en`.
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
 *       400: { description: Type de mouvement sans reçu., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Mouvement introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
walletRoutes.get('/wallet/movements/:id/receipt', requireSessionUser, asyncHandler(getMovementReceipt))

/**
 * @openapi
 * /wallet/webhook:
 *   post:
 *     tags: [Wallet]
 *     summary: Webhook opérateur — confirmation d'une recharge (signature HMAC)
 *     description: Public, authentifié par l'en-tête `x-webhook-signature` (HMAC-SHA256 du corps brut) et protégé contre le rejeu (timestamp + nonce).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rechargeId, status, timestamp, nonce]
 *             properties:
 *               rechargeId: { type: string }
 *               status: { type: string, enum: [success, failed] }
 *               operatorRef: { type: string }
 *               timestamp: { type: integer }
 *               nonce: { type: string }
 *     responses:
 *       200:
 *         description: Recharge résolue (ou état courant si déjà résolue).
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { recharge: { $ref: '#/components/schemas/WalletRecharge' } } }
 *       400: { description: Corps webhook invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Signature invalide (ou rejeu)., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Recharge introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
walletRoutes.post('/wallet/webhook', asyncHandler(walletWebhook))
