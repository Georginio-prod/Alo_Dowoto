import type { Request, Response } from 'express'

/**
 * 404 par défaut pour toute route non montée, au même format JSON que les
 * erreurs applicatives (`errorHandler`).
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: true,
    statusCode: 404,
    message: `Route introuvable : ${req.method} ${req.path}`,
  })
}
