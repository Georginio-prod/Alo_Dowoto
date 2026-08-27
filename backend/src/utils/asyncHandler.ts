import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Enveloppe un handler/middleware asynchrone pour qu'une erreur levée (dont les
 * `HttpError`) soit transmise à `next()` — Express 4 ne capture pas les rejets
 * de promesse automatiquement. Sans cela, un `throw` dans un `async` échapperait
 * au gestionnaire d'erreurs centralisé.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
