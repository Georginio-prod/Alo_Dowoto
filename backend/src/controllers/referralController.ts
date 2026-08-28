import type { Request, Response } from 'express'
import { referralService } from '../services/referralService'

/**
 * Handler du parrainage (#365). Porté iso depuis
 * `server/api/referrals/me.get.ts` (ADR-0016). Réservé à un utilisateur connecté
 * (`requireSessionUser` monté sur la route). Renvoie le code de parrainage (créé
 * à la volée s'il n'existe pas), le montant du bonus et le tableau de suivi.
 */
export async function getMyReferrals(req: Request, res: Response): Promise<void> {
  res.json(await referralService.getDashboard(req.user!.id))
}
