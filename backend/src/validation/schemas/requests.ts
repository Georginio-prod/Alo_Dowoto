import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schéma de publication d'une demande de service (#43), porté iso depuis
 * `server/utils/apiValidation.ts#createServiceRequestSchema` (ADR-0016) : mêmes
 * champs, mêmes transformations (trim des compétences, filtrage des vides) et
 * mêmes messages français.
 */
export const createServiceRequestSchema = z.object({
  title: requiredTrimmed('Le titre de la demande est requis.'),
  skills: z
    .array(z.string())
    .optional()
    .default([])
    .transform((list) => list.map((skill) => skill.trim()).filter(Boolean))
    .refine((list) => list.length > 0, 'Indiquez au moins une compétence recherchée.'),
  description: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ''),
  budgetMax: z
    .number({ error: 'Budget maximum invalide.' })
    .refine((value) => Number.isFinite(value) && value > 0, 'Budget maximum invalide.'),
  urgency: z.enum(['immediate', 'semaine', 'flexible'], { error: 'Urgence invalide.' }),
  location: requiredTrimmed('La localisation est requise.'),
  sector: z.string().optional(),
})
