/**
 * Erreurs HTTP de l'API. Répliquent le vocabulaire des helpers Nitro actuels
 * (server/utils/apiError.ts) — mêmes codes, mêmes usages — pour garantir le
 * « zéro changement fonctionnel » côté web, mobile et dashboard.
 *
 * Le middleware `errorHandler` sérialise une `HttpError` au FORMAT NITRO exact :
 * `{ error: true, statusCode, message, data }` (voir docs/architecture-api.md
 * et ADR-0016). Toute route métier portée depuis `server/api/**` doit lever ces
 * erreurs — jamais un `res.status().json()` d'erreur ad hoc — pour rester iso.
 */
export class HttpError extends Error {
  readonly statusCode: number
  readonly data?: Record<string, unknown>

  constructor(statusCode: number, message: string, data?: Record<string, unknown>) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.data = data
  }
}

export function badRequest(message: string, data?: Record<string, unknown>): never {
  throw new HttpError(400, message, data)
}

export function unauthorized(message = 'Non connecté.'): never {
  throw new HttpError(401, message)
}

export function forbidden(message = 'Accès refusé.'): never {
  throw new HttpError(403, message)
}

export function notFound(message: string): never {
  throw new HttpError(404, message)
}

export function conflict(message: string): never {
  throw new HttpError(409, message)
}

/** Solde de portefeuille insuffisant pour un paiement en séquestre (#194). */
export function paymentRequired(message: string): never {
  throw new HttpError(402, message)
}

export function tooManyRequests(message: string, data?: Record<string, unknown>): never {
  throw new HttpError(429, message, data)
}

/** Un service externe (SMS, opérateur…) a échoué ou est injoignable (#23). */
export function badGateway(message: string): never {
  throw new HttpError(502, message)
}
