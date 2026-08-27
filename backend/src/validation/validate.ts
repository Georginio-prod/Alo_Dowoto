import type { RequestHandler } from 'express'
import type { z } from 'zod'
import { badRequest } from '../utils/apiError'

/**
 * Pont entre un schéma zod et une route Express — équivalent backend de
 * `readSchemaBody` (server/utils/apiValidation.ts, runtime Nitro). Valide une
 * source de la requête (corps par défaut) et, en cas d'échec, lève un
 * `badRequest` (400) portant **le premier message** du schéma — même
 * comportement et même forme de réponse que l'API Nitro actuelle (ADR-0016).
 *
 * Deux usages, selon le besoin de la route :
 *   - `parseSchema(schema, req.body)` : validation impérative dans un handler,
 *     retourne la valeur typée (utile quand le corps a d'abord été lu autrement,
 *     ex. webhooks à signature HMAC vérifiée sur le texte brut).
 *   - `validateBody(schema)` : middleware déclaratif qui valide `req.body`,
 *     **réécrit** `req.body` avec la valeur transformée par zod (trim, defaults…)
 *     puis passe la main. Le handler consomme un corps déjà normalisé et typé.
 */
export function parseSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  raw: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(raw)
  if (!result.success) {
    // On remonte le premier problème (le plus pertinent pour l'utilisateur) —
    // les messages sont rédigés en français dans chaque schéma.
    badRequest(result.error.issues[0]?.message ?? 'Requête invalide.')
  }
  return result.data
}

/** Middleware : valide et normalise `req.body` via `schema`, ou 400 iso Nitro. */
export function validateBody<TSchema extends z.ZodType>(schema: TSchema): RequestHandler {
  return (req, _res, next) => {
    req.body = parseSchema(schema, req.body)
    next()
  }
}

/** Middleware : valide et normalise `req.query` via `schema`, ou 400 iso Nitro. */
export function validateQuery<TSchema extends z.ZodType>(schema: TSchema): RequestHandler {
  return (req, _res, next) => {
    // On repeuple l'objet `req.query` existant plutôt que de le réassigner :
    // robuste au typage `ParsedQs` d'Express comme au getter en lecture seule
    // d'Express 5, si le backend y passe un jour.
    const parsed = parseSchema(schema, req.query) as Record<string, unknown>
    for (const key of Object.keys(req.query)) delete (req.query as Record<string, unknown>)[key]
    Object.assign(req.query as Record<string, unknown>, parsed)
    next()
  }
}
