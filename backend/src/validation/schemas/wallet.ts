import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schémas de validation du portefeuille (#192/#193). Portés **verbatim** depuis
 * `server/utils/apiValidation.ts` (ADR-0016) : mêmes bornes, mêmes messages —
 * condition du 400 iso vérifié par les tests.
 */

/** Montant minimum d'une recharge de portefeuille (F CFA). */
export const MIN_RECHARGE_AMOUNT = 500

/** Corps de `POST /api/wallet/recharge` (#193). */
export const walletRechargeSchema = z.object({
  provider: z.enum(['flooz', 'tmoney'], { error: 'Opérateur invalide.' }),
  phone: requiredTrimmed('Entrez un numéro valide (8 chiffres).'),
  amount: z
    .number({ error: `Le montant minimum de recharge est de ${MIN_RECHARGE_AMOUNT} F CFA.` })
    .refine(
      (value) => Number.isInteger(value) && value >= MIN_RECHARGE_AMOUNT,
      `Le montant minimum de recharge est de ${MIN_RECHARGE_AMOUNT} F CFA.`,
    ),
})

/** Corps de `POST /api/wallet/withdraw` (retrait prestataire). */
export const walletWithdrawSchema = z.object({
  amount: z
    .number({ error: 'Montant invalide.' })
    .refine((value) => Number.isFinite(value) && value > 0, 'Montant invalide.'),
})

/**
 * Corps (déjà parsé en JSON) de `POST /api/wallet/webhook` (#193). Validé APRÈS
 * vérification de signature HMAC — le corps brut est d'abord lu comme texte pour
 * la signature (voir `utils/webhookSignature.ts`), puis parsé ici via
 * `parseSchema`, jamais via `validateBody`.
 */
export const walletWebhookSchema = z.object({
  rechargeId: requiredTrimmed('Requête webhook invalide.'),
  status: z.enum(['success', 'failed'], { error: 'Requête webhook invalide.' }),
  operatorRef: z.string().optional(),
  timestamp: z.number({ error: 'Requête webhook invalide.' }),
  nonce: requiredTrimmed('Requête webhook invalide.'),
})

export type WalletRechargeInput = z.infer<typeof walletRechargeSchema>
export type WalletWithdrawInput = z.infer<typeof walletWithdrawSchema>
export type WalletWebhookInput = z.infer<typeof walletWebhookSchema>
