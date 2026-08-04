import { z } from 'zod'
import { requiredTrimmed } from '~~/server/utils/apiValidation'

/** Schémas zod des routes /api/admin/** (#dashboard-admin) — même convention que apiValidation.ts. */

export const reasonBodySchema = z.object({
  reason: requiredTrimmed('Le motif est obligatoire.'),
})

export const optionalReasonBodySchema = z.object({
  reason: z.string().trim().optional(),
})

export const kycApproveSchema = z.object({
  note: z.string().trim().optional(),
})

export const subscriptionExtendSchema = z.object({
  durationDays: z
    .number({ error: 'Durée invalide.' })
    .refine((value) => Number.isInteger(value) && value > 0 && value <= 3650, 'Durée invalide.'),
})

export const providerCategorySchema = z.object({
  sector: requiredTrimmed('Le secteur est requis.'),
})

export const providerZoneSchema = z.object({
  city: z.string().trim().optional(),
  quartier: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rayonInterventionKm: z.number().int().positive().optional(),
})

export const adminMessageSchema = z.object({
  subject: requiredTrimmed("L'objet du message est requis."),
  body: requiredTrimmed('Le message est requis.'),
})

export const manualRefundSchema = z.object({
  amount: z
    .number({ error: 'Montant invalide.' })
    .refine((value) => Number.isFinite(value) && value > 0, 'Montant invalide.')
    .optional(),
  reason: requiredTrimmed('Le motif du remboursement est obligatoire.'),
})

export const riskFlagSchema = z.object({
  riskFlag: z.boolean({ error: 'Valeur invalide.' }),
  note: z.string().trim().optional(),
})
