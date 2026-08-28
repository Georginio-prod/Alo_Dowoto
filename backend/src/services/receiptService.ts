import type { User } from '@prisma/client'
import { badRequest, notFound } from '../utils/apiError'
import {
  generateMovementReceiptPdf,
  generatePaymentReceiptPdf,
  type ReceiptLocale,
} from '../utils/receiptPdf'
import { paymentService } from './paymentService'
import { subscriptionService } from './subscriptionService'
import { walletService } from './walletService'
import { userRepository, type UserRepository } from '../repositories/userRepository'

/**
 * Reçus PDF (#363), orchestration **portée iso** depuis
 * `server/api/payments/[id]/receipt.get.ts` et
 * `server/api/wallet/movements/[id]/receipt.get.ts` (ADR-0016). Compose les
 * domaines déjà portés (paiement, abonnement, portefeuille, compte) pour vérifier
 * la propriété/l'éligibilité puis rendre le document. Chaque méthode renvoie le
 * buffer PDF et le nom de fichier ; la pose des en-têtes HTTP reste au contrôleur.
 */
export interface ReceiptFile {
  pdf: Buffer
  filename: string
}

export function createReceiptService(
  payments = paymentService,
  subscriptions = subscriptionService,
  wallet = walletService,
  users: UserRepository = userRepository,
) {
  return {
    /**
     * Reçu d'un paiement d'abonnement CONFIRMÉ, réservé à son titulaire. 404 si
     * le paiement est inconnu ou d'un autre compte ; 400 s'il n'est pas confirmé
     * (rien à justifier tant que l'opérateur n'a pas validé la transaction).
     */
    async paymentReceipt(user: User, id: string | undefined, locale: ReceiptLocale): Promise<ReceiptFile> {
      const payment = id ? await payments.getPayment(id) : null
      if (!payment || payment.userId !== user.id) notFound('Paiement introuvable.')
      if (payment.status !== 'confirmed') badRequest('Aucun reçu disponible pour un paiement non confirmé.')

      const subscription = await subscriptions.getSubscriptionById(payment.subscriptionId)
      if (!subscription) notFound('Abonnement introuvable.')

      const pdf = await generatePaymentReceiptPdf(payment, user, subscription.plan, locale)
      return { pdf, filename: `recu-abonnement-${payment.id.slice(0, 8)}.pdf` }
    },

    /**
     * Reçu d'un mouvement de portefeuille, réservé aux débits et libérations de
     * séquestre (seuls mouvements que l'issue demande de pouvoir justifier), et à
     * son titulaire. 404 si inconnu/autre compte ; 400 pour un autre type.
     */
    async movementReceipt(user: User, id: string | undefined, locale: ReceiptLocale): Promise<ReceiptFile> {
      const movement = id ? await wallet.getMovement(id) : null
      if (!movement || movement.walletUserId !== user.id) notFound('Mouvement introuvable.')
      if (movement.type !== 'escrow_debit' && movement.type !== 'escrow_release') {
        badRequest('Aucun reçu disponible pour ce type de mouvement.')
      }

      const counterparty = movement.counterpartyUserId ? await users.findById(movement.counterpartyUserId) : null
      const pdf = await generateMovementReceiptPdf(movement, user, counterparty, locale)
      return { pdf, filename: `recu-${movement.id.slice(0, 8)}.pdf` }
    },
  }
}

/** Instance par défaut, liée aux services/repositories partagés. */
export const receiptService = createReceiptService()
