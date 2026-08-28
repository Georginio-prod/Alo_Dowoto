import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schéma du message envoyé à l'assistant IA (#geoloc, 2.2), porté iso depuis
 * `server/utils/apiValidationAssistant.ts` (ADR-0016) : message non vide et
 * borné, coordonnées optionnelles (position détectée côté client).
 */
export const MAX_ASSISTANT_MESSAGE_LENGTH = 2000

export const assistantChatSchema = z.object({
  message: requiredTrimmed('Le message est requis.').refine(
    (value) => value.length <= MAX_ASSISTANT_MESSAGE_LENGTH,
    `Le message dépasse la longueur maximale autorisée (${MAX_ASSISTANT_MESSAGE_LENGTH} caractères).`,
  ),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})
