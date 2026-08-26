import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/apiError'

/**
 * Gestionnaire d'erreurs centralisé. Sérialise TOUTE erreur au format Nitro
 * exact — `{ error: true, statusCode, message, data }` — pour que le web, le
 * mobile et le dashboard reçoivent des réponses identiques à l'actuel
 * (ADR-0016). Une erreur inattendue (non `HttpError`) devient un 500 générique
 * dont le détail est journalisé mais jamais renvoyé au client.
 *
 * La signature à 4 paramètres est requise par Express pour reconnaître un
 * middleware d'erreur (`next` inclus même inutilisé).
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const isHttp = err instanceof HttpError
  const statusCode = isHttp ? err.statusCode : 500
  const message = isHttp ? err.message : 'Erreur interne du serveur.'
  const data = isHttp ? err.data : undefined

  if (statusCode >= 500) {
    console.error('[api] erreur non gérée :', err)
  }

  res.status(statusCode).json({
    error: true,
    statusCode,
    message,
    ...(data ? { data } : {}),
  })
}
