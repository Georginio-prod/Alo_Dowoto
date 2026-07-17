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
