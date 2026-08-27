import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schéma du domaine « réclamations » (`POST /api/reclamations`). Porté
 * **verbatim** depuis `server/utils/apiValidationMisc.ts#createComplaintSchema`
 * (ADR-0016) : mêmes bornes, mêmes messages. Les valeurs de catégories sont
 * copiées de `app/data/complaintCategories.ts` (le backend est standalone et
 * n'importe pas le code de l'app) — à garder synchronisées si la liste évolue.
 */
export const COMPLAINT_CATEGORY_VALUES = [
  'prestataire', 'chercheur', 'paiement', 'compte', 'technique', 'autre',
] as const

export type ComplaintCategory = (typeof COMPLAINT_CATEGORY_VALUES)[number]

/** Corps de `POST /api/reclamations` (ouvert à tout visiteur, pas de session requise). */
export const createComplaintSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORY_VALUES, { error: 'Sélectionnez une catégorie de réclamation.' }),
  subject: z
    .string({ error: 'Le sujet doit contenir entre 3 et 120 caractères.' })
    .transform((v) => v.trim())
    .refine((v) => v.length >= 3 && v.length <= 120, 'Le sujet doit contenir entre 3 et 120 caractères.'),
  message: z
    .string({ error: 'Le message doit contenir entre 10 et 2000 caractères.' })
    .transform((v) => v.trim())
    .refine((v) => v.length >= 10 && v.length <= 2000, 'Le message doit contenir entre 10 et 2000 caractères.'),
  contactEmail: requiredTrimmed('Indiquez une adresse email ou un numéro de téléphone de contact.'),
})

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>
