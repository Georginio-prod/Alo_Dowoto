import type { Request, Response } from 'express'
import { badRequest, notFound, paymentRequired } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { normalizeContact } from '../utils/contact'
import { walletService, MIN_WITHDRAWAL_AMOUNT } from '../services/walletService'
import { providerProfileService } from '../services/providerProfileService'
import { receiptService } from '../services/receiptService'
import { receiptLocaleFromQuery } from '../utils/receiptPdf'
import type { WalletRechargeInput, WalletWithdrawInput } from '../validation/schemas/wallet'

/**
 * Handlers du portefeuille interne (#192/#193). Portés iso depuis
 * `server/api/wallet/**` (ADR-0016). Le webhook est public (signature HMAC) ;
 * les autres routes exigent une session (retrait : rôle prestataire).
 */

/** GET /api/wallet/me → { balance, movements, minWithdrawal }. */
export async function getMyWallet(req: Request, res: Response): Promise<void> {
  res.json(await walletService.getWallet(authUser(req).id))
}

/** POST /api/wallet/recharge → { recharge } (pending ; confirmée par webhook/simulation). */
export async function createRecharge(req: Request, res: Response): Promise<void> {
  const body = req.body as WalletRechargeInput
  const phone = normalizeContact('phone', body.phone)
  if (!phone) badRequest('Entrez un numéro valide (8 chiffres).')
  const recharge = await walletService.createRecharge({ userId: authUser(req).id, provider: body.provider, phone, amount: body.amount })
  res.json({ recharge })
}

/** GET /api/wallet/recharge/:id → { recharge } (404 si inconnue ou d'un autre compte). */
export async function getRecharge(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  const recharge = id ? await walletService.getRecharge(id) : null
  if (!recharge || recharge.userId !== authUser(req).id) notFound('Recharge introuvable.')
  res.json({ recharge })
}

/** POST /api/wallet/withdraw → { movement } (retrait prestataire vers son moyen de paiement). */
export async function withdraw(req: Request, res: Response): Promise<void> {
  const user = authUser(req)
  const { amount } = req.body as WalletWithdrawInput

  const profile = await providerProfileService.getProviderProfile(user.id)
  if (!profile?.payoutMethod) badRequest('Choisissez un moyen de retrait avant de faire une demande.')

  const result = await walletService.requestWithdrawal(user.id, amount)
  if (!result.ok) {
    if (result.error === 'below_minimum') {
      badRequest(`Le retrait minimum est de ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('fr-FR')} F CFA.`)
    }
    paymentRequired('Solde insuffisant pour ce retrait.')
  }
  res.json({ movement: result.movement })
}

/** GET /api/wallet/movements/:id/receipt → PDF (reçu d'un mouvement d'escrow, #363). */
export async function getMovementReceipt(req: Request, res: Response): Promise<void> {
  const locale = receiptLocaleFromQuery(req.query.locale)
  const { pdf, filename } = await receiptService.movementReceipt(authUser(req), req.params.id, locale)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(pdf)
}

/** POST /api/wallet/webhook → { recharge } — confirmation opérateur (signature HMAC + anti-rejeu). */
export async function walletWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.rawBody?.toString('utf8') ?? ''
  const signature = req.get('x-webhook-signature') ?? undefined
  const recharge = await walletService.processWebhook(rawBody, signature)
  res.json({ recharge })
}
