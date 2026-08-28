import type { Request, Response } from 'express'
import { authUser } from '../utils/authUser'
import { verificationService } from '../services/verificationService'
import type { SubmitVerificationInput } from '../validation/schemas/verification'

/**
 * Handlers de la vérification d'identité (#180+1). Portés iso depuis
 * `server/api/verification/*` (ADR-0016). Réservés à un utilisateur connecté
 * (`requireSessionUser` monté sur les routes). Aucune image n'est renvoyée.
 */

/** GET /api/verification/me → { verified, submittedAt } (pas d'images). */
export async function getMyVerification(req: Request, res: Response): Promise<void> {
  const verification = await verificationService.getVerification(authUser(req).id)
  res.json({
    verified: verification !== null,
    submittedAt: verification?.submittedAt ?? null,
  })
}

/** POST /api/verification → { verified: true, submittedAt }. Auto-certification. */
export async function submitVerification(req: Request, res: Response): Promise<void> {
  const { idCardImage, passportPhotoImage } = req.body as SubmitVerificationInput
  const verification = await verificationService.submitVerification(authUser(req).id, idCardImage, passportPhotoImage)
  res.json({ verified: true, submittedAt: verification.submittedAt })
}
