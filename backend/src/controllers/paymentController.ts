import type { Request, Response } from 'express'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { normalizeContact } from '../utils/contact'
import { paymentService } from '../services/paymentService'
import { subscriptionService } from '../services/subscriptionService'
import { receiptService } from '../services/receiptService'
import { receiptLocaleFromQuery } from '../utils/receiptPdf'
import type { InitiatePaymentInput } from '../validation/schemas/payments'

/**
 * Handlers du paiement d'abonnement Mobile Money (#34). Portés iso depuis
 * `server/api/payments/**` (ADR-0016). Le webhook est public (signature HMAC) ;
 * initiate/me exigent le rôle prestataire, la lecture d'un paiement une session.
 */

/** POST /api/payments/initiate → { payment } (pending ; confirmé par webhook/simulation). */
export async function initiatePayment(req: Request, res: Response): Promise<void> {
  const body = req.body as InitiatePaymentInput
  const phone = normalizeContact('phone', body.phone)
  if (!phone) badRequest('Entrez un numéro valide (8 chiffres).')
  const payment = await paymentService.initiatePayment(authUser(req).id, { provider: body.provider, phone, subscriptionId: body.subscriptionId })
  res.json({ payment })
}

/** GET /api/payments/me → { payments, plan } (paiements confirmés + formule courante). */
export async function getMyPayments(req: Request, res: Response): Promise<void> {
  const userId = authUser(req).id
  const [payments, subscription] = await Promise.all([
    paymentService.listConfirmedByUser(userId),
    subscriptionService.getSubscriptionByUserId(userId),
  ])
  res.json({ payments, plan: subscription?.plan ?? null })
}

/** GET /api/payments/:id → { payment } (404 si inconnu ou d'un autre compte). */
export async function getPayment(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  const payment = id ? await paymentService.getPayment(id) : null
  if (!payment || payment.userId !== authUser(req).id) notFound('Paiement introuvable.')
  res.json({ payment })
}

/** GET /api/payments/:id/receipt → PDF (reçu d'un paiement confirmé, #363). */
export async function getPaymentReceipt(req: Request, res: Response): Promise<void> {
  const locale = receiptLocaleFromQuery(req.query.locale)
  const { pdf, filename } = await receiptService.paymentReceipt(authUser(req), req.params.id, locale)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(pdf)
}

/** POST /api/payments/webhook → { payment } — confirmation opérateur (signature HMAC + anti-rejeu). */
export async function paymentWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.rawBody?.toString('utf8') ?? ''
  const signature = req.get('x-webhook-signature') ?? undefined
  const payment = await paymentService.processWebhook(rawBody, signature)
  res.json({ payment })
}
