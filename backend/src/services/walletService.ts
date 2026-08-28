import { badRequest, notFound, unauthorized } from '../utils/apiError'
import { parseSchema } from '../validation/validate'
import { walletWebhookSchema } from '../validation/schemas/wallet'
import { isValidWebhookSignature, isWebhookTimestampFresh } from '../utils/webhookSignature'
import {
  walletMovementRepository,
  type WalletMovement,
  type WalletMovementRepository,
  type RequestWithdrawalResult,
} from '../repositories/walletMovementRepository'
import {
  walletRechargeRepository,
  type WalletRecharge,
  type WalletRechargeProvider,
  type WalletRechargeRepository,
} from '../repositories/walletRechargeRepository'
import { webhookNonceRepository, type WebhookNonceRepository } from '../repositories/webhookNonceRepository'

/**
 * Portefeuille interne (#192/#193). Orchestration **portée iso** depuis
 * `server/api/wallet/**` + `walletStore`/`walletRechargeStore` (ADR-0016) :
 * solde recalculé, recharge (avec confirmation opérateur simulée hors prod),
 * retrait, et webhook opérateur (signature HMAC + anti-rejeu #355).
 */

/** Retrait minimum autorisé par demande (F CFA) — iso `walletStore`. */
export const MIN_WITHDRAWAL_AMOUNT = 5000

/** Délai de la confirmation opérateur simulée hors production (#193). */
const SIMULATED_CONFIRMATION_DELAY_MS = 3000

export type ServiceWithdrawalResult = RequestWithdrawalResult | { ok: false; error: 'below_minimum' }

export function createWalletService(
  movements: WalletMovementRepository = walletMovementRepository,
  recharges: WalletRechargeRepository = walletRechargeRepository,
  nonces: WebhookNonceRepository = webhookNonceRepository,
) {
  /** Applique une confirmation opérateur (idempotent), crédite si succès. Iso `resolveRecharge`. */
  async function resolveRecharge(id: string, status: 'confirmed' | 'failed', operatorRef?: string): Promise<WalletRecharge | null> {
    const existing = await recharges.findById(id)
    if (!existing) return null
    if (existing.status !== 'pending') return existing

    const count = await recharges.markResolved(id, status, operatorRef)
    // Un envoi concurrent a résolu entre-temps : on relit l'état effectif.
    if (count === 0) return recharges.findById(id)

    if (status === 'confirmed') {
      await movements.creditRecharge(existing.userId, existing.amount, existing.id)
    }
    return recharges.findById(id)
  }

  return {
    resolveRecharge,

    /** GET /api/wallet/me → solde + mouvements + retrait minimum. */
    async getWallet(userId: string): Promise<{ balance: number; movements: WalletMovement[]; minWithdrawal: number }> {
      const [balance, list] = await Promise.all([movements.getBalance(userId), movements.listByUser(userId)])
      return { balance, movements: list, minWithdrawal: MIN_WITHDRAWAL_AMOUNT }
    },

    async getRecharge(id: string): Promise<WalletRecharge | null> {
      return recharges.findById(id)
    },

    /** Mouvement de portefeuille par id (reçu PDF #363), ou `null`. */
    async getMovement(id: string): Promise<WalletMovement | null> {
      return movements.findById(id)
    },

    /** Crée une recharge `pending` ; hors prod, planifie la confirmation simulée. */
    async createRecharge(input: { userId: string; provider: WalletRechargeProvider; phone: string; amount: number }): Promise<WalletRecharge> {
      const recharge = await recharges.create(input)
      // Pas d'accès aux API sandbox Flooz/T-Money pour ce lot (#193) : hors prod
      // on simule la confirmation opérateur après un délai ; en prod, seul le
      // vrai webhook résout la recharge. `.unref()` : ne retient pas le process
      // (tests courts) — le comportement observable via l'API est inchangé.
      if (process.env.NODE_ENV !== 'production') {
        setTimeout(() => {
          void resolveRecharge(recharge.id, 'confirmed', `SIMULATED-${recharge.id.slice(0, 8)}`).catch(() => {})
        }, SIMULATED_CONFIRMATION_DELAY_MS).unref?.()
      }
      return recharge
    },

    /** Débite un retrait prestataire (below_minimum / insufficient_funds sinon). */
    async requestWithdrawal(userId: string, amount: number): Promise<ServiceWithdrawalResult> {
      if (amount < MIN_WITHDRAWAL_AMOUNT) return { ok: false, error: 'below_minimum' }
      return movements.requestWithdrawal(userId, amount)
    },

    /** Traite un webhook opérateur : signature → parse → anti-rejeu → résolution. */
    async processWebhook(rawBody: string, signature: string | undefined): Promise<WalletRecharge> {
      if (!isValidWebhookSignature(rawBody, signature)) unauthorized('Signature invalide.')

      let parsed: unknown
      try {
        parsed = JSON.parse(rawBody || '{}')
      } catch {
        badRequest('Corps webhook illisible (JSON invalide).')
      }
      const body = parseSchema(walletWebhookSchema, parsed)

      const recharge = await recharges.findById(body.rechargeId)
      if (!recharge) notFound('Recharge introuvable.')
      // Idempotent : une recharge déjà résolue renvoie son état, sans anti-rejeu.
      if (recharge.status !== 'pending') return recharge

      // Anti-rejeu (#355) : recharge trop ancienne, ou nonce déjà servi → refus.
      if (!isWebhookTimestampFresh(body.timestamp) || (await nonces.consume(body.nonce))) {
        unauthorized('Signature invalide.')
      }

      const resolved = await resolveRecharge(recharge.id, body.status === 'success' ? 'confirmed' : 'failed', body.operatorRef)
      // `resolved` ne peut être null ici (recharge lue juste avant), mais on
      // reste défensif pour le typage.
      return resolved ?? recharge
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const walletService = createWalletService()
