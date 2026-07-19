import { createHmac, timingSafeEqual } from 'node:crypto'

const DEV_WEBHOOK_SECRET = 'dev-webhook-secret'

/**
 * Secret partagé pour signer/vérifier les webhooks de paiement et de recharge
 * (#34, #193). Résolu à chaque appel (et non figé au chargement du module)
 * pour rester testable et lever l'erreur au moment de la requête plutôt qu'à
 * l'import.
 *
 * En production, `PAYMENT_WEBHOOK_SECRET` **doit** être défini (secrets CI /
 * variables Vercel, voir #47) : à défaut, on refuse de retomber sur le secret
 * de développement — public et connu — qui rendrait les webhooks forgeables
 * (confirmation de paiement / activation d'abonnement par un tiers). Le repli
 * `dev-webhook-secret` ne sert qu'en dehors de la production.
 */
function resolveWebhookSecret(): string {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'PAYMENT_WEBHOOK_SECRET doit être défini en production (aucun repli sur le secret de développement).',
    )
  }
  return DEV_WEBHOOK_SECRET
}

export function signWebhookBody(rawBody: string): string {
  return createHmac('sha256', resolveWebhookSecret()).update(rawBody).digest('hex')
}

export function isValidWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false
  const expected = signWebhookBody(rawBody)
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== signatureBuffer.length) return false
  return timingSafeEqual(expectedBuffer, signatureBuffer)
}
