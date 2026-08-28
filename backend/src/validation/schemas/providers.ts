import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schémas du domaine « prestataires ». Portés **verbatim** depuis
 * `server/utils/apiValidationProviders.ts` (ADR-0016). Pour l'instant : la
 * déclaration d'indisponibilité (#290). Le format/ordre des dates reste vérifié
 * par le service (`addUnavailabilityPeriod`).
 */
export const addAvailabilitySchema = z.object({
  startDate: requiredTrimmed('Les dates de début et de fin sont requises.'),
  endDate: requiredTrimmed('Les dates de début et de fin sont requises.'),
})

export type AddAvailabilityInput = z.infer<typeof addAvailabilitySchema>
