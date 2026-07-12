import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Secret partagé pour vérifier la signature du webhook de paiement (#34).
 * En production, WEBHOOK_SECRET doit être défini via les variables
 * d'environnement (secrets CI, voir #47) ; le repli ci-dessous ne sert
 * qu'au développement local, en l'absence de vrai compte Flooz/T-Money
 * sandbox pour ce lot.
 */
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? 'dev-webhook-secret'

export function signWebhookBody(rawBody: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
}

export function isValidWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false
  const expected = signWebhookBody(rawBody)
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== signatureBuffer.length) return false
  return timingSafeEqual(expectedBuffer, signatureBuffer)
}
