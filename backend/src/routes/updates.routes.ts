import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { relayUpdateFile } from '../controllers/updatesController'

/**
 * Relais de mises à jour du dashboard desktop (#Electron auto-update), porté
 * depuis `server/api/updates/[...file].get.ts` (Phase 2, ADR-0017). Monté sous
 * `/api` → `/api/updates/<fichier>`, iso Nitro.
 *
 * ⚠️ Volontairement EXEMPTÉ du limiteur de débit global (voir `config/server.ts`) :
 * un téléchargement différentiel electron-updater émet de nombreuses requêtes
 * `Range` rapprochées, qui dépasseraient la fenêtre de 300 req/min.
 */
export const updatesRoutes = Router()

/**
 * @openapi
 * /updates/{file}:
 *   get:
 *     tags: [Updates]
 *     summary: Relais public d'un asset de la dernière release desktop (Electron)
 *     description: Sert `latest.yml`, l'installeur et son `.blockmap` depuis le dépôt GitHub privé. Relaie l'en-tête `Range` pour le téléchargement différentiel.
 *     parameters:
 *       - in: path
 *         name: file
 *         required: true
 *         schema: { type: string }
 *         description: Nom de fichier demandé par electron-updater.
 *     responses:
 *       200: { description: Contenu de l'asset (octet-stream ou YAML). }
 *       206: { description: Contenu partiel (téléchargement différentiel). }
 *       404: { description: Fichier introuvable dans la release., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       500: { description: Relais non configuré (jeton manquant)., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       502: { description: Release GitHub inaccessible ou téléchargement refusé., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
updatesRoutes.get('/updates/*', asyncHandler(relayUpdateFile))
