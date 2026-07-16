import { randomUUID } from 'node:crypto'

/**
 * Store en mémoire pour le portefeuille interne WorkTogo et la traçabilité
 * des mouvements de fonds (#192, socle du système de séquestre — voir
 * l'epic #191). Suffisant pour ce lot (pas de base de données encore en
 * place, voir #45/#46), même limite que server/utils/paymentStore.ts.
 *
 * Le solde n'est jamais stocké : il est toujours recalculé à partir du
 * journal des mouvements (`listMovements`) pour garantir qu'il reste
 * vérifiable et qu'aucune dérive n'est possible entre un compteur et son
 * historique (critère d'acceptation #192). Le journal est un append-only
 * log : aucune fonction ne modifie ni ne supprime un mouvement existant.
 */

/**
 * - `recharge` : le chercheur alimente son solde via mobile money (#193).
 * - `escrow_debit` : le chercheur paie une prestation, fonds mis en
 *   séquestre (#194) — seul mouvement débiteur du solde de son émetteur.
 * - `escrow_release` : le séquestre est libéré vers le prestataire après
 *   double validation (#195), net de la commission WorkTogo.
 * - `escrow_refund` : le prestataire annule après débit, remboursement
 *   intégral au chercheur (#196).
 * - `commission` : part prélevée par WorkTogo à la libération, créditée au
 *   portefeuille plateforme (voir PLATFORM_WALLET_USER_ID).
 */
export type WalletMovementType = 'recharge' | 'escrow_debit' | 'escrow_release' | 'escrow_refund' | 'commission'

/** Identifiant conventionnel du portefeuille interne WorkTogo (commissions). */
export const PLATFORM_WALLET_USER_ID = 'worktogo-platform'

export interface WalletMovement {
  id: string
  walletUserId: string
  type: WalletMovementType
  /** Toujours positif : le sens (crédit/débit) dépend uniquement de `type`, voir MOVEMENT_SIGN. */
  amount: number
  /** Référence externe (id de paiement mobile money) ou interne (id de commande séquestre). */
  reference: string
  /** L'autre utilisateur concerné par le mouvement, quand pertinent (ex. le prestataire payé). */
  counterpartyUserId: string | null
  createdAt: number
}

/**
 * Signe appliqué au solde du titulaire du mouvement (`walletUserId`).
 * Seul `escrow_debit` retire des fonds ; tous les autres mouvements en
 * ajoutent (recharge, réception d'un séquestre libéré, remboursement,
 * commission plateforme).
 */
const MOVEMENT_SIGN: Record<WalletMovementType, 1 | -1> = {
  recharge: 1,
  escrow_debit: -1,
  escrow_release: 1,
  escrow_refund: 1,
  commission: 1,
}

const movementsByUserId = new Map<string, WalletMovement[]>()

export interface RecordMovementInput {
  walletUserId: string
  type: WalletMovementType
  amount: number
  reference: string
  counterpartyUserId?: string | null
}

function appendMovement(input: RecordMovementInput): WalletMovement {
  const movement: WalletMovement = {
    id: randomUUID(),
    walletUserId: input.walletUserId,
    type: input.type,
    amount: input.amount,
    reference: input.reference,
    counterpartyUserId: input.counterpartyUserId ?? null,
    createdAt: Date.now(),
  }
  const list = movementsByUserId.get(input.walletUserId)
  if (!list) movementsByUserId.set(input.walletUserId, [movement])
  else list.push(movement)
  return movement
}

/** Journal des mouvements d'un utilisateur, du plus récent au plus ancien. */
export function listMovements(userId: string): WalletMovement[] {
  return [...(movementsByUserId.get(userId) ?? [])].sort((a, b) => b.createdAt - a.createdAt)
}

/** Solde courant, toujours recalculé à partir du journal (jamais mis en cache). */
export function getBalance(userId: string): number {
  const movements = movementsByUserId.get(userId) ?? []
  return movements.reduce((total, movement) => total + movement.amount * MOVEMENT_SIGN[movement.type], 0)
}

/**
 * Crédite le portefeuille (recharge, libération de séquestre, remboursement
 * ou commission plateforme). `amount` doit être strictement positif.
 */
export function creditWallet(input: RecordMovementInput): WalletMovement {
  if (input.type === 'escrow_debit') {
    throw new Error('creditWallet ne doit pas recevoir de mouvement escrow_debit (utiliser debitWallet).')
  }
  if (input.amount <= 0) {
    throw new Error('Le montant crédité doit être positif.')
  }
  return appendMovement(input)
}

/**
 * Débite le portefeuille (mise en séquestre lors d'un paiement, #194).
 * Retourne `null` si le solde est insuffisant — le mouvement n'est alors
 * pas journalisé et le solde reste inchangé. L'appelant traduit ce cas en
 * réponse HTTP appropriée (409, voir server/utils/apiError.ts).
 */
export function debitWallet(input: Omit<RecordMovementInput, 'type'>): WalletMovement | null {
  if (input.amount <= 0) {
    throw new Error('Le montant débité doit être positif.')
  }
  if (getBalance(input.walletUserId) < input.amount) {
    return null
  }
  return appendMovement({ ...input, type: 'escrow_debit' })
}
