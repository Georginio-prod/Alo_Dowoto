/**
 * Helpers pour lever des erreurs API avec un vocabulaire HTTP cohérent.
 *
 * Nitro normalise déjà la réponse JSON de toutes les routes /api/** (y
 * compris les erreurs non interceptées) sous la forme
 * `{ error: true, statusCode, statusMessage, message, data }` — voir
 * docs/architecture-api.md. Ces helpers évitent de dupliquer
 * `createError({ statusCode, statusMessage })` dans chaque route et fixent
 * le code HTTP associé à chaque cas d'usage courant de l'API.
 */

export function badRequest(message: string, data?: Record<string, unknown>): never {
  throw createError({ statusCode: 400, statusMessage: message, data })
}

export function unauthorized(message = 'Non connecté.'): never {
  throw createError({ statusCode: 401, statusMessage: message })
}

export function forbidden(message = 'Accès refusé.'): never {
  throw createError({ statusCode: 403, statusMessage: message })
}

export function notFound(message: string): never {
  throw createError({ statusCode: 404, statusMessage: message })
}

export function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message })
}

/** Solde de portefeuille insuffisant pour un paiement en séquestre (#194). */
export function paymentRequired(message: string): never {
  throw createError({ statusCode: 402, statusMessage: message })
}

export function tooManyRequests(message: string, data?: Record<string, unknown>): never {
  throw createError({ statusCode: 429, statusMessage: message, data })
}
