import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schémas zod des endpoints de messagerie/escrow sous `/api/conversations/**`,
 * portés iso depuis `server/utils/apiValidationConversations.ts` (ADR-0016).
 * Les endpoints sans corps (pay, deliver, receive, confirm-order,
 * confirm-reschedule, recurring.delete) n'ont pas de schéma.
 */

/** Corps de `POST /api/conversations` (création/récupération idempotente d'un fil). */
export const createConversationSchema = z.object({
  providerId: requiredTrimmed("L'identifiant du prestataire est requis."),
})

/**
 * Corps de `POST /api/conversations/:id/check-in` et `.../check-out` (#268).
 * Coordonnées facultatives : une paire absente/partielle est ignorée par le
 * handler (le type est garanti quand les deux sont fournies).
 */
export const checkInOutSchema = z
  .object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
  .default({})

/** Corps de `POST /api/conversations/:id/first-contact` (#129). */
export const firstContactSchema = z.object({
  description: requiredTrimmed('Décrivez votre besoin pour envoyer votre demande.'),
  contact: requiredTrimmed('Vos coordonnées sont requises pour envoyer votre demande.'),
  urgency: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ''),
  /** Réponses aux champs additionnels différenciés par secteur (#295). */
  sectorAnswers: z.record(z.string(), z.string()).optional().default({}),
})

/** Corps de `POST /api/conversations/:id/messages` (message classique). */
export const sendMessageSchema = z.object({
  body: requiredTrimmed('Le message ne peut pas être vide.'),
})

/**
 * Corps de `POST /api/conversations/:id/propose-reschedule` (#270). Le
 * caractère "dans le futur" de `proposedAt` est vérifié dans le handler.
 */
export const proposeRescheduleSchema = z.object({
  proposedAt: z
    .number({ error: 'La date proposée doit être une date future valide.' })
    .refine((value) => Number.isFinite(value), 'La date proposée doit être une date future valide.'),
  note: z.string().optional(),
})

/** Corps de `POST /api/conversations/:id/rebook` (#266). */
export const rebookSchema = z.object({
  description: requiredTrimmed('Décrivez votre nouvelle demande pour relancer ce prestataire.'),
})

/** Corps de `POST /api/conversations/:id/recurring` (#271). */
export const recurringServiceSchema = z.object({
  frequency: z.enum(['hebdomadaire', 'mensuelle'], { error: 'Fréquence invalide (hebdomadaire ou mensuelle).' }),
})

/** Corps de `POST /api/conversations/:id/review` (#61). */
export const submitReviewSchema = z.object({
  rating: z
    .number({ error: 'La note doit être un entier entre 1 et 5.' })
    .refine((value) => Number.isInteger(value) && value >= 1 && value <= 5, 'La note doit être un entier entre 1 et 5.'),
  comment: z.string().optional(),
})

/** Corps de `POST /api/conversations/:id/share-location`. */
export const shareLocationSchema = z.object({
  lat: z
    .number({ error: 'Coordonnées de localisation invalides.' })
    .refine((value) => !Number.isNaN(value) && value >= -90 && value <= 90, 'Coordonnées de localisation invalides.'),
  lng: z
    .number({ error: 'Coordonnées de localisation invalides.' })
    .refine((value) => !Number.isNaN(value) && value >= -180 && value <= 180, 'Coordonnées de localisation invalides.'),
})

/** Corps des annulations escrow (`cancel`, `client-cancel`) — motif obligatoire. */
export const cancelEscrowSchema = z.object({
  reason: requiredTrimmed("Le motif d'annulation est obligatoire."),
})

/** Corps de `POST /api/conversations/:id/dispute` (#197/#274) — motif obligatoire, preuves facultatives. */
export const disputeEscrowSchema = z.object({
  reason: requiredTrimmed('Le motif du litige est obligatoire.'),
  /** Preuves à l'appui (#274) : texte libre, pas d'upload de fichier dans ce lot. */
  evidence: z.string().trim().optional(),
})

/** Corps de `POST /api/conversations/:id/respond-dispute` (#274) — réponse obligatoire. */
export const respondDisputeSchema = z.object({
  response: requiredTrimmed('Votre réponse au litige est obligatoire.'),
})

/** Corps de `POST /api/conversations/:id/confirm-dispute-resolution` (#274). */
export const confirmDisputeResolutionSchema = z.object({
  confirmed: z.boolean({ error: 'Confirmation invalide.' }),
})
