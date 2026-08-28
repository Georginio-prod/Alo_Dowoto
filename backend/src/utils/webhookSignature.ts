import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signature/vérification HMAC des webhooks opérateur (paiement #34, recharge
 * #193) et fenêtre anti-rejeu (#355). Portées **verbatim** depuis
 * `server/utils/webhookSignature.ts` (ADR-0016) — mêmes secret, algorithme et
 * fenêtre, condition de l'iso-fonctionnement. La partie *nonce* (persistance)
 * vit dans `repositories/webhookNonceRepository.ts` (accès base).
 */

const DEV_WEBHOOK_SECRET = 'dev-webhook-secret'

/**
 * Secret partagé, résolu à chaque appel (testable, erreur au moment de la
 * requête). En production `PAYMENT_WEBHOOK_SECRET` **doit** être défini : pas de
 * repli sur le secret de dev, public et connu, qui rendrait les webhooks
 * forgeables.
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

/** Fenêtre anti-rejeu (#355) : un webhook daté hors de cette fenêtre est refusé. */
export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000

/** Un webhook trop ancien, ou trop dans le futur (dérive d'horloge), est refusé. */
export function isWebhookTimestampFresh(timestamp: number): boolean {
  return Math.abs(Date.now() - timestamp) <= WEBHOOK_REPLAY_WINDOW_MS
}
