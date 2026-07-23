import { z } from 'zod'
import { SECTORS } from '~~/app/data/sectors'
import { isValidCoordinatePair, requiredTrimmed } from '~~/server/utils/apiValidation'
import { MOBILITY_OPTIONS, PAYOUT_METHODS } from '~~/server/utils/providerStore'
import type { Mobility, PayoutMethod } from '~~/server/utils/providerStore'

/**
 * Schémas zod pour `server/api/providers/**` (#356, audit M5). Les règles
 * dépendant de l'état existant en base (secteur hérité du profil déjà
 * enregistré, complétude de l'onboarding via `resolveRequiredOnboardingFields`)
 * restent dans le handler — un schéma zod ne voit que le corps brut.
 */

/** Corps de `POST /api/providers/availability` (#290, période d'indisponibilité). Le format/ordre des dates reste vérifié par `addUnavailabilityPeriod`. */
export const addAvailabilitySchema = z.object({
  startDate: requiredTrimmed('Les dates de début et de fin sont requises.'),
  endDate: requiredTrimmed('Les dates de début et de fin sont requises.'),
})

const VALID_SECTOR_SLUGS = SECTORS.map((sector) => sector.slug)
const MAX_LANGUAGES = 12
const MAX_FORMATIONS = 15
const MAX_CERTIFICATIONS = 15

/**
 * Le handler ne vérifiait jusqu'ici que `title` à l'exécution, mais le type
 * `FormationEntry` (server/utils/providerStore.ts) déclare `institution` et
 * `year` non optionnels : la frontière de typage était déjà franchie avant
 * #356 (un corps sans ces champs passait le hand-typed interface sans
 * vérification réelle). Aligné ici sur le vrai contrat de `FormationEntry`.
 */
const formationEntrySchema = z.object({
  title: requiredTrimmed('Liste de formations invalide.'),
  institution: requiredTrimmed('Liste de formations invalide.'),
  year: requiredTrimmed('Liste de formations invalide.'),
})

/** Même remarque que `formationEntrySchema` — aligné sur `CertificationEntry`. */
const certificationEntrySchema = z.object({
  id: requiredTrimmed('Liste de certifications invalide.'),
  title: requiredTrimmed('Liste de certifications invalide.'),
  fileUrl: z.string({ error: 'Liste de certifications invalide.' }).min(1, 'Liste de certifications invalide.'),
  fileName: requiredTrimmed('Liste de certifications invalide.'),
  status: z.enum(['en_attente', 'verifiee'], { error: 'Liste de certifications invalide.' }),
})

/**
 * Corps de `PATCH /api/providers/me` (fiche prestataire complète). `sector`
 * est optionnel ici : un profil déjà enregistré peut omettre le champ et
 * hériter du secteur existant — c'est le handler qui tranche via
 * `getProviderProfile`, avant d'appliquer la contrainte "obligatoire au
 * global" que ce schéma ne peut pas voir seul.
 */
export const patchProviderSchema = z.object({
  sector: z.enum(VALID_SECTOR_SLUGS as [string, ...string[]], { error: 'Secteur invalide.' }).optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  payoutMethod: z.enum(PAYOUT_METHODS as [PayoutMethod, ...PayoutMethod[]], { error: 'Le mode de rémunération WorkTogo est obligatoire.' }).optional(),
  photoUrl: z.string().optional(),
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
