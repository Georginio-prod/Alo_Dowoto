import { z } from 'zod'

/**
 * Briques de validation réutilisables, **agnostiques du framework** (aucune
 * dépendance à h3/Nitro ni à Express). Portées à l'identique depuis
 * `server/utils/apiValidation.ts` pour que les schémas de domaine repris en
 * Phase 2 conservent des règles et des messages **iso** (ADR-0016) — mêmes
 * textes français, lus tels quels côté front (`app/utils/apiErrorMessage`).
 *
 * Ces primitives sont le socle « partagé » de la validation : chaque domaine
 * porté vers Express (`src/validation/schemas/**`) les compose, plutôt que de
 * redéfinir des règles divergentes route par route.
 */

/** Chaîne obligatoire une fois les espaces retirés, avec message dédié. */
export function requiredTrimmed(message: string) {
  return z
    .string({ error: message })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, message)
}

/**
 * Valide une paire de coordonnées GPS (même plage que
 * `server/api/conversations/[id]/share-location.post.ts`). Une paire
 * invalide/partielle n'est pas une erreur de forme : l'appelant décide de
 * l'ignorer — d'où une fonction booléenne plutôt qu'un schéma branché sur le
 * bridge de validation.
 */
export function isValidCoordinatePair(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && !Number.isNaN(lat) && !Number.isNaN(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}
