import { z } from 'zod'
import { isValidCoordinatePair, requiredTrimmed } from '../primitives'
import { isValidImageDataUrl } from '../../utils/imageDataUrl'
import { SECTORS } from '../../data/sectors'
import { listAllQuartiers } from '../../data/regions'
import { MOBILITY_OPTIONS, PAYOUT_METHODS, type Mobility, type PayoutMethod } from '../../services/providerProfileService'

/**
 * Schémas du domaine « prestataires ». Portés **verbatim** depuis
 * `server/utils/apiValidationProviders.ts` (ADR-0016). Les règles dépendant de
 * l'état en base (secteur hérité, complétude onboarding) restent au controller.
 */

/** Corps de `POST /api/providers/availability` (#290). Format/ordre des dates vérifiés par le service. */
export const addAvailabilitySchema = z.object({
  startDate: requiredTrimmed('Les dates de début et de fin sont requises.'),
  endDate: requiredTrimmed('Les dates de début et de fin sont requises.'),
})

export type AddAvailabilityInput = z.infer<typeof addAvailabilitySchema>

const VALID_SECTOR_SLUGS = SECTORS.map((sector) => sector.slug)
const VALID_QUARTIER_SLUGS = listAllQuartiers().map((quartier) => quartier.slug)
const MAX_LANGUAGES = 12
const MAX_FORMATIONS = 15
const MAX_CERTIFICATIONS = 15
const MAX_RAYON_INTERVENTION_KM = 200

const formationEntrySchema = z.object({
  title: requiredTrimmed('Liste de formations invalide.'),
  institution: requiredTrimmed('Liste de formations invalide.'),
  year: requiredTrimmed('Liste de formations invalide.'),
})

const certificationEntrySchema = z.object({
  id: requiredTrimmed('Liste de certifications invalide.'),
  title: requiredTrimmed('Liste de certifications invalide.'),
  fileUrl: z.string({ error: 'Liste de certifications invalide.' }).min(1, 'Liste de certifications invalide.'),
  fileName: requiredTrimmed('Liste de certifications invalide.'),
  status: z.enum(['en_attente', 'verifiee'], { error: 'Liste de certifications invalide.' }),
})

/** Corps de `PATCH /api/providers/me` (fiche prestataire complète). */
export const patchProviderSchema = z.object({
  sector: z.enum(VALID_SECTOR_SLUGS as [string, ...string[]], { error: 'Secteur invalide.' }).optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  quartier: z.enum(VALID_QUARTIER_SLUGS as [string, ...string[]], { error: 'Quartier invalide.' }).optional(),
  adresse: z.string().optional(),
  pointsDeRepere: z.string().optional(),
  rayonInterventionKm: z
    .number({ error: "Rayon d'intervention invalide." })
    .refine((v) => v > 0 && v <= MAX_RAYON_INTERVENTION_KM, "Rayon d'intervention invalide.")
    .optional(),
  positionApproximative: z.boolean().optional(),
  payoutMethod: z.enum(PAYOUT_METHODS as [PayoutMethod, ...PayoutMethod[]], { error: 'Le mode de rémunération WorkTogo est obligatoire.' }).optional(),
  photoUrl: z.string().refine(isValidImageDataUrl, 'Photo de profil invalide (JPEG ou PNG, 5 Mo maximum).').optional(),
  description: z.string().optional(),
  rateFrom: z.number({ error: 'Tarif invalide.' }).refine((v) => v >= 0, 'Tarif invalide.').optional(),
  rateTo: z.number({ error: 'Tarif invalide.' }).refine((v) => v >= 0, 'Tarif invalide.').optional(),
  mobility: z.enum(MOBILITY_OPTIONS as [Mobility, ...Mobility[]], { error: 'Préférence de déplacement invalide.' }).optional(),
  availability: z.string().optional(),
  cvUrl: z.string().nullable().optional(),
  cvFileName: z.string().nullable().optional(),
  languages: z
    .array(
      z.string().transform((v) => v.trim()).refine((v) => v.length > 0, 'Liste de langues invalide.'),
      { error: 'Liste de langues invalide.' },
    )
    .max(MAX_LANGUAGES, 'Liste de langues invalide.')
    .optional(),
  formations: z.array(formationEntrySchema, { error: 'Liste de formations invalide.' }).max(MAX_FORMATIONS, 'Liste de formations invalide.').optional(),
  certifications: z.array(certificationEntrySchema, { error: 'Liste de certifications invalide.' }).max(MAX_CERTIFICATIONS, 'Liste de certifications invalide.').optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
}).refine(
  (body) => body.rateFrom === undefined || body.rateTo === undefined || body.rateTo >= body.rateFrom,
  'Le tarif maximum doit être supérieur ou égal au tarif minimum.',
).refine(
  (body) => (body.latitude === undefined && body.longitude === undefined) || isValidCoordinatePair(body.latitude, body.longitude),
  'Coordonnées GPS invalides.',
)

export type PatchProviderInput = z.infer<typeof patchProviderSchema>
