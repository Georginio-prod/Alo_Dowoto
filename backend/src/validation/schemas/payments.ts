import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schémas du paiement d'abonnement Mobile Money (#34). Portés **verbatim** depuis
 * `server/utils/apiValidation.ts` (ADR-0016) : mêmes bornes, mêmes messages.
 */

/** Corps de `POST /api/payments/initiate`. */
export const initiatePaymentSchema = z.object({
  subscriptionId: z.string().optional(),
  provider: z.enum(['flooz', 'tmoney'], { error: 'Opérateur invalide.' }),
  phone: requiredTrimmed('Entrez un numéro valide (8 chiffres).'),
})

/**
 * Corps (déjà parsé) de `POST /api/payments/webhook` — validé APRÈS vérification
 * de signature HMAC (corps brut lu comme texte), via `parseSchema`.
 */
export const paymentWebhookSchema = z.object({
  paymentId: requiredTrimmed('Requête webhook invalide.'),
  status: z.enum(['success', 'failed'], { error: 'Requête webhook invalide.' }),
  operatorRef: z.string().optional(),
  timestamp: z.number({ error: 'Requête webhook invalide.' }),
  nonce: requiredTrimmed('Requête webhook invalide.'),
})

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>
