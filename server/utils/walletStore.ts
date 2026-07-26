import { randomUUID } from 'node:crypto'
import type { Prisma, WalletMovement as PrismaWalletMovement } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Portefeuille interne WorkTogo et traçabilité des mouvements de fonds (#192,
 * socle du séquestre — epic #191), persistés en base (Prisma/SQLite, #342,
 * ADR 0013). Les mouvements survivent désormais aux redémarrages du serveur.
 *
 * Le solde n'est jamais stocké : il est toujours recalculé à partir du
 * journal des mouvements (critère d'acceptation #192). Le journal est un
 * append-only log : aucune fonction ne modifie ni ne supprime un mouvement
 * existant.
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
 * - `retrait` : le prestataire retire son solde vers son moyen de paiement
 *   configuré (#hub-profil-prestataire, voir requestWithdrawal ci-dessous).
 * - `cancellation_compensation` : le chercheur annule après le délai de
 *   grâce (#275, grille d'annulation) — indemnise le prestataire pour le
 *   temps bloqué, distinct de `escrow_release` (prestation effectivement
 *   réalisée et validée).
 * - `dispute_penalty` : un litige se résout en défaveur du prestataire
 *   (chercheur confirme que le travail n'est pas fait, ou timeout sans
 *   confirmation) — voir escrowDisputeResolution.ts.
 * - `dispute_compensation` : contrepartie de `dispute_penalty`, versée au
 *   chercheur en plus du remboursement intégral du séquestre.
 */
export type WalletMovementType =
  | 'recharge'
  | 'escrow_debit'
  | 'escrow_release'
  | 'escrow_refund'
  | 'commission'
  | 'retrait'
  | 'cancellation_compensation'
  | 'dispute_penalty'
  | 'dispute_compensation'

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
 * `escrow_debit` et `retrait` retirent des fonds ; tous les autres
 * mouvements en ajoutent (recharge, réception d'un séquestre libéré,
 * remboursement, commission plateforme).
 */
const MOVEMENT_SIGN: Record<WalletMovementType, 1 | -1> = {
  recharge: 1,
  escrow_debit: -1,
  escrow_release: 1,
  escrow_refund: 1,
  commission: 1,
  retrait: -1,
  cancellation_compensation: 1,
  dispute_penalty: -1,
  dispute_compensation: 1,
}

export interface RecordMovementInput {
  walletUserId: string
  type: WalletMovementType
  amount: number
  reference: string
  counterpartyUserId?: string | null
}

function toMovement(row: PrismaWalletMovement): WalletMovement {
  return {
    id: row.id,
    walletUserId: row.walletUserId,
    type: row.type as WalletMovementType,
    amount: row.amount,
    reference: row.reference,
    counterpartyUserId: row.counterpartyUserId,
    createdAt: row.createdAt.getTime(),
  }
}

/** Somme signée d'un ensemble de mouvements (crédit/débit selon `type`). */
function sumBalance(rows: Pick<PrismaWalletMovement, 'amount' | 'type'>[]): number {
  return rows.reduce((total, m) => total + m.amount * MOVEMENT_SIGN[m.type as WalletMovementType], 0)
}

function buildMovementData(input: RecordMovementInput): Prisma.WalletMovementCreateInput {
  return {
    id: randomUUID(),
    walletUserId: input.walletUserId,
    type: input.type,
    amount: input.amount,
    reference: input.reference,
    counterpartyUserId: input.counterpartyUserId ?? null,
    // Horodatage applicatif (et non `@default(now())` côté base) : garantit un
    // ordre déterministe même pour des insertions rapprochées et reste
    // sensible à un mock de `Date.now` dans les tests.
    createdAt: new Date(Date.now()),
  }
}

/** Journal des mouvements d'un utilisateur, du plus récent au plus ancien. */
export async function listMovements(userId: string): Promise<WalletMovement[]> {
  const rows = await prisma.walletMovement.findMany({
    where: { walletUserId: userId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toMovement)
}

/** Solde courant, toujours recalculé à partir du journal (jamais mis en cache). */
export async function getBalance(userId: string): Promise<number> {
  const rows = await prisma.walletMovement.findMany({
    where: { walletUserId: userId },
    select: { amount: true, type: true },
  })
  return sumBalance(rows)
}

/**
 * Crédite le portefeuille (recharge, libération de séquestre, remboursement
 * ou commission plateforme). `amount` doit être strictement positif. Un crédit
 * est append-only et ne dépend d'aucune lecture préalable : pas de transaction.
 */
export async function creditWallet(input: RecordMovementInput): Promise<WalletMovement> {
  if (input.type === 'escrow_debit') {
    throw new Error('creditWallet ne doit pas recevoir de mouvement escrow_debit (utiliser debitWallet).')
  }
  if (input.amount <= 0) {
    throw new Error('Le montant crédité doit être positif.')
  }
  const row = await prisma.walletMovement.create({ data: buildMovementData(input) })
  return toMovement(row)
}

/**
 * Débite le portefeuille (mise en séquestre lors d'un paiement, #194).
 * Retourne `null` si le solde est insuffisant — le mouvement n'est alors
 * pas journalisé et le solde reste inchangé. La vérification du solde et
 * l'écriture du mouvement sont encadrées par une transaction : contrairement
 * à l'ancienne `Map` mono-thread, deux débits concurrents ne peuvent plus
 * passer tous les deux la vérification et créer un découvert.
 */
export async function debitWallet(input: Omit<RecordMovementInput, 'type'>): Promise<WalletMovement | null> {
  if (input.amount <= 0) {
    throw new Error('Le montant débité doit être positif.')
  }
  return prisma.$transaction(async (tx) => {
    const rows = await tx.walletMovement.findMany({
      where: { walletUserId: input.walletUserId },
      select: { amount: true, type: true },
    })
    if (sumBalance(rows) < input.amount) return null
    const row = await tx.walletMovement.create({ data: buildMovementData({ ...input, type: 'escrow_debit' }) })
    return toMovement(row)
  })
}

/**
 * Débite le portefeuille au titre d'une pénalité (litige résolu en défaveur
 * du prestataire, voir escrowDisputeResolution.ts) — contrairement à
 * `debitWallet`, ne renvoie jamais `null` : un prestataire fautif sans solde
 * suffisant ne doit pas échapper à toute conséquence faute de fonds à
 * débiter. Le montant réellement débité est plafonné au solde disponible
 * (jamais de découvert) et renvoyé pour que l'appelant sache si la pénalité
 * a été appliquée intégralement.
 */
export async function debitWalletForPenalty(input: Omit<RecordMovementInput, 'type' | 'amount'> & { amount: number }): Promise<WalletMovement | null> {
  if (input.amount <= 0) {
    throw new Error('Le montant de la pénalité doit être positif.')
  }
  return prisma.$transaction(async (tx) => {
    const rows = await tx.walletMovement.findMany({
      where: { walletUserId: input.walletUserId },
      select: { amount: true, type: true },
    })
    const balance = sumBalance(rows)
    if (balance <= 0) return null
    const amount = Math.min(input.amount, balance)
    const row = await tx.walletMovement.create({ data: buildMovementData({ ...input, type: 'dispute_penalty', amount }) })
    return toMovement(row)
  })
}

/**
 * Retrait minimum autorisé par demande (F CFA) — cohérent avec les montants
 * de retrait mobile money usuels au Togo. Valeur métier pragmatique en
 * attendant un arbitrage produit dédié.
 */
export const MIN_WITHDRAWAL_AMOUNT = 5000

export type RequestWithdrawalResult =
  | { ok: true; movement: WalletMovement }
  | { ok: false; error: 'below_minimum' | 'insufficient_funds' }

/**
 * Demande de retrait prestataire (« Solde », dashboard prestataire) vers le
 * moyen de paiement configuré sur son profil. Débite immédiatement le
 * portefeuille, sur le même principe (et la même atomicité) que `debitWallet`.
 */
export async function requestWithdrawal(userId: string, amount: number): Promise<RequestWithdrawalResult> {
  if (amount < MIN_WITHDRAWAL_AMOUNT) return { ok: false, error: 'below_minimum' }

  const movement = await prisma.$transaction(async (tx) => {
    const rows = await tx.walletMovement.findMany({
      where: { walletUserId: userId },
      select: { amount: true, type: true },
    })
    if (sumBalance(rows) < amount) return null
    const row = await tx.walletMovement.create({
      data: buildMovementData({ walletUserId: userId, type: 'retrait', amount, reference: randomUUID() }),
    })
    return toMovement(row)
  })

  if (!movement) return { ok: false, error: 'insufficient_funds' }
  return { ok: true, movement }
}
