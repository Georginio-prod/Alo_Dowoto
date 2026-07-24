import { z } from 'zod'
import { requiredTrimmed } from '~~/server/utils/apiValidation'

/**
 * Schémas zod pour les endpoints de messagerie/escrow sous
 * `server/api/conversations/[id]/**` (#356, audit M5). Les endpoints qui ne
 * lisent aucun corps (pay, deliver, receive, confirm-order,
 * confirm-reschedule, recurring.delete) n'ont pas de schéma : rien à valider.
 */

/** Corps de `POST /api/conversations` (création/récupération idempotente d'un fil). */
export const createConversationSchema = z.object({
  providerId: requiredTrimmed("L'identifiant du prestataire est requis."),
})

/**
 * Corps de `POST /api/conversations/[id]/check-in` et `.../check-out` (#268,
 * preuve d'intervention). Coordonnées facultatives (le navigateur peut
 * refuser la géolocalisation) : une paire absente ou partielle n'est pas une
 * erreur, elle est simplement ignorée par le handler (voir
 * `isValidCoordinatePair` pour la variante qui, elle, rejette une paire
 * invalide — ici on ne fait que garantir le type quand les deux sont fournis).
 */
export const checkInOutSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
}).default({})

/** Corps de `POST /api/conversations/[id]/first-contact` (#129, formulaire obligatoire de première prise de contact). */
export const firstContactSchema = z.object({
  description: requiredTrimmed('Décrivez votre besoin pour envoyer votre demande.'),
  contact: requiredTrimmed('Vos coordonnées sont requises pour envoyer votre demande.'),
  urgency: z.string().optional().transform((v) => v?.trim() ?? ''),
  /** Réponses aux champs additionnels différenciés par secteur (#295). */
  sectorAnswers: z.record(z.string(), z.string()).optional().default({}),
})

/** Corps de `POST /api/conversations/[id]/messages` (message classique dans un fil). */
export const sendMessageSchema = z.object({
  body: requiredTrimmed('Le message ne peut pas être vide.'),
})

/**
 * Corps de `POST /api/conversations/[id]/propose-reschedule` (#270). Le
 * caractère "dans le futur" de `proposedAt` dépend de `Date.now()` au moment
 * de la requête (donc dynamique) : vérifié dans le handler, pas ici.
 */
export const proposeRescheduleSchema = z.object({
  proposedAt: z
    .number({ error: 'La date proposée doit être une date future valide.' })
    .refine((value) => Number.isFinite(value), 'La date proposée doit être une date future valide.'),
  note: z.string().optional(),
})

/** Corps de `POST /api/conversations/[id]/rebook` (#266, reprise rapide d'un prestataire déjà utilisé). */
export const rebookSchema = z.object({
  description: requiredTrimmed('Décrivez votre nouvelle demande pour relancer ce prestataire.'),
})

/** Corps de `POST /api/conversations/[id]/recurring` (#271, mise en place d'un service récurrent). */
export const recurringServiceSchema = z.object({
  frequency: z.enum(['hebdomadaire', 'mensuelle'], { error: 'Fréquence invalide (hebdomadaire ou mensuelle).' }),
})

/** Corps de `POST /api/conversations/[id]/review` (#61, notation mutuelle de fin de collaboration). */
export const submitReviewSchema = z.object({
  rating: z
    .number({ error: 'La note doit être un entier entre 1 et 5.' })
    .refine((value) => Number.isInteger(value) && value >= 1 && value <= 5, 'La note doit être un entier entre 1 et 5.'),
  comment: z.string().optional(),
})

/** Corps de `POST /api/conversations/[id]/share-location` (partage ponctuel de localisation par le chercheur). */
export const shareLocationSchema = z.object({
  lat: z
    .number({ error: 'Coordonnées de localisation invalides.' })
    .refine((value) => !Number.isNaN(value) && value >= -90 && value <= 90, 'Coordonnées de localisation invalides.'),
  lng: z
    .number({ error: 'Coordonnées de localisation invalides.' })
    .refine((value) => !Number.isNaN(value) && value >= -180 && value <= 180, 'Coordonnées de localisation invalides.'),
})
