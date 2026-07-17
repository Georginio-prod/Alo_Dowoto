/**
 * Helpers pour lever des erreurs API avec un vocabulaire HTTP cohérent.
 *
 * Nitro normalise déjà la réponse JSON de toutes les routes /api/** (y
 * compris les erreurs non interceptées) sous la forme
 * `{ error: true, statusCode, message, data }` — voir
 * docs/architecture-api.md. Ces helpers évitent de dupliquer
 * `createError({ statusCode, message })` dans chaque route et fixent
 * le code HTTP associé à chaque cas d'usage courant de l'API.
 *
 * Les messages passent par `message` (jamais `statusMessage`) : h3
 * assainit la ligne de statut HTTP et émettait un warning à chaque erreur
 * contenant des accents français — le corps JSON, lui, transporte le
 * message intact (lu côté front par apiErrorMessage, app/utils).
 */

export function badRequest(message: string, data?: Record<string, unknown>): never {
  throw createError({ statusCode: 400, message, data })
}

export function unauthorized(message = 'Non connecté.'): never {
  throw createError({ statusCode: 401, message })
}

export function forbidden(message = 'Accès refusé.'): never {
  throw createError({ statusCode: 403, message })
}

export function notFound(message: string): never {
  throw createError({ statusCode: 404, message })
}

export function conflict(message: string): never {
  throw createError({ statusCode: 409, message })
}

/** Solde de portefeuille insuffisant pour un paiement en séquestre (#194). */
export function paymentRequired(message: string): never {
  throw createError({ statusCode: 402, message })
}

export function tooManyRequests(message: string, data?: Record<string, unknown>): never {
  throw createError({ statusCode: 429, message, data })
}

/** Un service externe (provider SMS, opérateur…) a échoué ou est injoignable (#23). */
export function badGateway(message: string): never {
  throw createError({ statusCode: 502, statusMessage: message })
}
