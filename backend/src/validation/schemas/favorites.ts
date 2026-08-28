import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schéma du domaine « favoris » (`POST /api/favorites`). Porté **verbatim**
 * depuis `server/utils/apiValidationMisc.ts#addFavoriteSchema` (ADR-0016).
 */

/** Corps de `POST /api/favorites` (#65, ajout d'un prestataire aux favoris). */
export const addFavoriteSchema = z.object({
  providerId: requiredTrimmed("L'identifiant du prestataire est requis."),
})

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>
