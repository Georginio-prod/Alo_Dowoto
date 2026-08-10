import { z } from 'zod'

/** Schéma zod du marquage d'une section de tutoriel (#tutoriel-onboarding). */
export const markSectionSchema = z.object({
  sectionId: z
    .string({ error: "L'identifiant de section est requis." })
    .transform((v) => v.trim())
    .refine((v) => v.length >= 1 && v.length <= 64, "L'identifiant de section est invalide."),
})
