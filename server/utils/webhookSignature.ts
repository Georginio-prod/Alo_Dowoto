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

/**
 * Anti-rejeu (#355, audit M4) : un webhook signature valide capturé peut être
 * rejoué tant que le paiement/recharge visé reste `pending` (une fois résolu,
 * le rejeu est déjà sans effet — idempotence par statut dans
 * paymentStore/walletRechargeStore). `timestamp` et `nonce` font partie du
 * corps signé : la signature HMAC les couvre déjà, un attaquant ne peut ni
 * les falsifier ni les retirer sans invalider la signature.
 *
 * Le nonce est suivi en mémoire (un seul process PM2, voir
 * ecosystem.config.cjs) avec une expiration alignée sur la fenêtre de
 * fraîcheur : inutile de le retenir plus longtemps qu'un webhook ne peut de
 * toute façon plus être accepté comme frais.
 */
const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000

const consumedNonces = new Map<string, number>()

function pruneExpiredNonces(now: number): void {
  for (const [nonce, expiresAt] of consumedNonces) {
    if (expiresAt <= now) consumedNonces.delete(nonce)
  }
}

/** Un webhook daté hors de la fenêtre de fraîcheur (trop ancien, ou trop dans le futur — dérive d'horloge) est refusé. */
export function isWebhookTimestampFresh(timestamp: number): boolean {
  return Math.abs(Date.now() - timestamp) <= WEBHOOK_REPLAY_WINDOW_MS
}

/**
 * Marque ce nonce comme consommé et indique s'il l'était déjà. À n'appeler
 * que pour une résolution encore `pending` — un rejeu après résolution est
 * déjà inoffensif et ne doit pas passer par cette vérification (voir les
 * appelants dans server/api/payments/webhook.post.ts et wallet/webhook.post.ts).
 */
export function consumeWebhookNonce(nonce: string): boolean {
  const now = Date.now()
  pruneExpiredNonces(now)
  if (consumedNonces.has(nonce)) return true
  consumedNonces.set(nonce, now + WEBHOOK_REPLAY_WINDOW_MS)
  return false
}
