import { z } from 'zod'

/**
 * Schémas de validation du domaine « avis d'accueil ». Porté **verbatim** depuis
 * `server/utils/apiValidationMisc.ts#createTestimonialSchema` (ADR-0016) : mêmes
 * bornes, mêmes messages français — condition du 400 iso vérifié par les tests.
 */

/** Corps de `POST /api/testimonials` (avis d'accueil, ouvert à tout visiteur, #357 incrément 3). */
export const createTestimonialSchema = z.object({
  name: z
    .string({ error: 'Le nom doit contenir entre 2 et 60 caractères.' })
    .transform((v) => v.trim())
    .refine((v) => v.length >= 2 && v.length <= 60, 'Le nom doit contenir entre 2 et 60 caractères.'),
  role: z.enum(['client', 'prestataire'], { error: 'Précisez si vous êtes chercheur ou prestataire.' }),
  message: z
    .string({ error: 'Le message doit contenir entre 10 et 400 caractères.' })
    .transform((v) => v.trim())
    .refine((v) => v.length >= 10 && v.length <= 400, 'Le message doit contenir entre 10 et 400 caractères.'),
  rating: z
    .number({ error: 'La note doit être un nombre entier entre 1 et 5.' })
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 5, 'La note doit être un nombre entier entre 1 et 5.'),
})

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>
