import { z } from 'zod'
import { requiredTrimmed } from '~~/server/utils/apiValidation'

/** Longueur maximale d'un message envoyé à l'assistant — évite un abus de tokens envoyés au modèle. */
export const MAX_ASSISTANT_MESSAGE_LENGTH = 2000

/** Corps de `POST /api/assistant/chat` (#geoloc, 2.2). */
export const assistantChatSchema = z.object({
  message: requiredTrimmed('Le message est requis.').refine(
    (value) => value.length <= MAX_ASSISTANT_MESSAGE_LENGTH,
    `Le message dépasse la longueur maximale autorisée (${MAX_ASSISTANT_MESSAGE_LENGTH} caractères).`,
  ),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})
