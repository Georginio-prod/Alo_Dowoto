import { z } from 'zod'
import { COMPLAINT_CATEGORIES } from '~/data/complaintCategories'
import type { ComplaintCategory } from '~/data/complaintCategories'
import { requiredTrimmed } from '~~/server/utils/apiValidation'
import { isValidIdentityImage } from '~~/server/utils/verificationStore'

/** Schémas zod pour favoris, réclamations, abonnements, avis d'accueil et vérification d'identité (#356, audit M5). */

/** Corps de `POST /api/favorites` (#65, ajout d'un prestataire aux favoris). */
export const addFavoriteSchema = z.object({
  providerId: requiredTrimmed("L'identifiant du prestataire est requis."),
})

const VALID_COMPLAINT_CATEGORIES = COMPLAINT_CATEGORIES.map((option) => option.value)

/** Corps de `POST /api/reclamations` (ouvert à tout visiteur, pas de session requise). */
export const createComplaintSchema = z.object({
  category: z.enum(VALID_COMPLAINT_CATEGORIES as [ComplaintCategory, ...ComplaintCategory[]], { error: 'Sélectionnez une catégorie de réclamation.' }),
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

/** Corps de `POST /api/subscriptions` et `POST /api/subscriptions/trial` (formule identique dans les deux cas — `findPlan` valide la valeur réelle dans le handler). */
export const planSlugSchema = z.object({
  plan: z.string().optional().default(''),
})

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

/** Corps de `POST /api/verification` (#180+1, soumission des documents d'identité). */
export const submitVerificationSchema = z.object({
  idCardImage: z.unknown().refine(isValidIdentityImage, "La photo de la carte d'identité est requise (JPEG ou PNG, 5 Mo maximum)."),
  passportPhotoImage: z.unknown().refine(isValidIdentityImage, 'La photo passeport (fond blanc, format international) est requise (JPEG ou PNG, 5 Mo maximum).'),
})
