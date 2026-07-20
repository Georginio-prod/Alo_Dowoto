import type { H3Event } from 'h3'
import { z } from 'zod'

/**
 * Validation déclarative des corps de requête via zod (#pré-audit).
 *
 * Motivation : sur les payloads riches (plusieurs champs, tableaux, énumérations,
 * contraintes numériques), la validation manuelle inline est facile à oublier
 * ou à laisser diverger d'une route à l'autre. Un schéma zod :
 *   - centralise les règles au même endroit, typé ;
 *   - est **testable unitairement** sans lancer le serveur (safeParse sur un
 *     objet), là où un handler Nitro ne l'est pas (auto-imports globaux) ;
 *   - conserve des messages d'erreur en français, lus tels quels côté front
 *     (app/utils/apiErrorMessage).
 *
 * `readSchemaBody` est le pont entre un schéma et une route : il lit le corps,
 * le valide, et traduit le premier problème en `badRequest` (400) — même forme
 * de réponse que le reste de l'API.
 */
export async function readSchemaBody<TSchema extends z.ZodType>(
  event: H3Event,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const raw = await readBody(event).catch(() => undefined)
  const result = schema.safeParse(raw)
  if (!result.success) {
    // On remonte le premier message (le plus pertinent pour l'utilisateur) —
    // les messages sont rédigés en français dans chaque schéma.
    badRequest(result.error.issues[0]?.message ?? 'Requête invalide.')
  }
  return result.data
}

/** Chaîne obligatoire une fois espaces retirés, avec message dédié. */
function requiredTrimmed(message: string) {
  return z
    .string({ error: message })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, message)
}

/**
 * Corps de `POST /api/requests` (#43, publication d'une demande). Reproduit à
 * l'identique les règles et messages de l'ancienne validation inline du
 * handler, mais de façon déclarative et testée.
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

/**
 * Corps de `POST /api/payments/initiate` (#34, paiement d'abonnement mobile
 * money). Ne valide que la forme (opérateur, téléphone non vide) — la
 * normalisation du numéro (`normalizeContact`) et la résolution de
 * l'abonnement restent dans le handler, ce ne sont pas des règles de forme.
 */
export const initiatePaymentSchema = z.object({
  subscriptionId: z.string().optional(),
  provider: z.enum(['flooz', 'tmoney'], { error: 'Opérateur invalide.' }),
  phone: requiredTrimmed('Entrez un numéro valide (8 chiffres).'),
})

/** Montant minimum d'une recharge de portefeuille (#193). */
export const MIN_RECHARGE_AMOUNT = 500

/** Corps de `POST /api/wallet/recharge` (#193, recharge de portefeuille mobile money). */
export const walletRechargeSchema = z.object({
  provider: z.enum(['flooz', 'tmoney'], { error: 'Opérateur invalide.' }),
  phone: requiredTrimmed('Entrez un numéro valide (8 chiffres).'),
  amount: z
    .number({ error: `Le montant minimum de recharge est de ${MIN_RECHARGE_AMOUNT} F CFA.` })
    .refine(
      (value) => Number.isInteger(value) && value >= MIN_RECHARGE_AMOUNT,
      `Le montant minimum de recharge est de ${MIN_RECHARGE_AMOUNT} F CFA.`,
    ),
})

/**
 * Corps de `POST /api/wallet/withdraw` (retrait prestataire). Ne valide que
 * la forme (nombre fini positif) — le minimum de retrait réel est une règle
 * métier appliquée par `requestWithdrawal` (server/utils/walletStore.ts),
 * pas dupliquée ici.
 */
export const walletWithdrawSchema = z.object({
  amount: z
    .number({ error: 'Montant invalide.' })
    .refine((value) => Number.isFinite(value) && value > 0, 'Montant invalide.'),
})

/** Corps de `POST /api/conversations/[id]/dispute` (#197, ouverture d'un litige escrow). */
export const disputeEscrowSchema = z.object({
  reason: requiredTrimmed('Le motif du litige est obligatoire.'),
})

/** Corps de `POST /api/conversations/[id]/cancel` (#196, annulation escrow côté prestataire). */
export const cancelEscrowSchema = z.object({
  reason: requiredTrimmed("Le motif d'annulation est obligatoire."),
})

/**
 * Valide une paire de coordonnées GPS (même plage que
 * `server/api/conversations/[id]/share-location.post.ts`). Utilisée pour les
 * coordonnées optionnelles de `POST /api/auth/session` (géolocalisation à
 * l'inscription) : une paire invalide/partielle n'est pas une erreur 400 —
 * elle est simplement ignorée par l'appelant, donc une fonction plutôt qu'un
 * schéma zod branché sur `readSchemaBody`.
 */
export function isValidCoordinatePair(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && !Number.isNaN(lat) && !Number.isNaN(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}
