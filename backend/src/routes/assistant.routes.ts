import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { validateBody } from '../validation/validate'
import { assistantChatSchema } from '../validation/schemas/assistant'
import { assistantChat } from '../controllers/assistantController'

/**
 * Assistant IA (#geoloc, 2.2), porté depuis `server/api/assistant/chat.post.ts`
 * (Phase 2, ADR-0017). Monté sous `/api` → chemin iso Nitro. Route **publique**
 * (accessible aux visiteurs non connectés) : la limitation de débit retombe sur
 * l'adresse IP. Le mode dégradé (FAQ) évite toute erreur brute.
 */
export const assistantRoutes = Router()

/**
 * @openapi
 * /assistant/chat:
 *   post:
 *     tags: [Assistant]
 *     summary: Message à l'assistant IA (recommandations, FAQ)
 *     description: Appel serveur uniquement (clé API jamais exposée). Sans fournisseur configuré ou en cas de panne, bascule en mode dégradé (recherche FAQ) avec `degraded: true`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, maxLength: 2000 }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses:
 *       200:
 *         description: Réponse de l'assistant.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 degraded: { type: boolean }
 *                 text: { type: string }
 *                 toolCalls: { type: array, items: { type: object } }
 *                 fromCache: { type: boolean }
 *       400: { description: Message invalide (vide ou trop long)., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Trop de messages en peu de temps (mode dégradé, corps informatif). }
 */
assistantRoutes.post('/assistant/chat', validateBody(assistantChatSchema), asyncHandler(assistantChat))
