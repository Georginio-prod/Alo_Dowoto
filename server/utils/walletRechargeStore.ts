import { randomUUID } from 'node:crypto'
import { creditWallet } from '~~/server/utils/walletStore'

/**
 * Store en mémoire pour les recharges du portefeuille WorkTogo via mobile
 * money (#193). Même limite que server/utils/paymentStore.ts (pas de base
 * de données encore en place, voir #45/#46) et même mécanique : le montant
 * n'est crédité sur le portefeuille (server/utils/walletStore.ts) qu'une
 * fois la recharge confirmée par l'opérateur — jamais tant qu'elle est
 * `pending`, pour que le journal du portefeuille ne contienne que des
 * mouvements définitifs.
 */

export type WalletRechargeProvider = 'flooz' | 'tmoney'
export type WalletRechargeStatus = 'pending' | 'confirmed' | 'failed'

export interface WalletRecharge {
  id: string
  userId: string
  provider: WalletRechargeProvider
  phone: string
  amount: number
  status: WalletRechargeStatus
  operatorRef: string | null
  createdAt: number
  resolvedAt: number | null
}

const recharges = new Map<string, WalletRecharge>()

export function createRecharge(input: {
  userId: string
  provider: WalletRechargeProvider
  phone: string
  amount: number
}): WalletRecharge {
  const recharge: WalletRecharge = {
    id: randomUUID(),
    userId: input.userId,
    provider: input.provider,
    phone: input.phone,
    amount: input.amount,
    status: 'pending',
    operatorRef: null,
    createdAt: Date.now(),
    resolvedAt: null,
  }
  recharges.set(recharge.id, recharge)
  return recharge
}

export function getRecharge(id: string): WalletRecharge | null {
  return recharges.get(id) ?? null
}

/**
 * Applique le résultat d'une confirmation opérateur (webhook réel en prod,
 * simulation en dev — voir server/api/wallet/recharge.post.ts). Idempotent :
 * une recharge déjà résolue n'est jamais réévaluée. Ne crédite le
 * portefeuille que si la confirmation est un succès.
 */
export function resolveRecharge(id: string, status: 'confirmed' | 'failed', operatorRef?: string): WalletRecharge | null {
  const recharge = recharges.get(id)
  if (!recharge || recharge.status !== 'pending') return recharge ?? null

  recharge.status = status
  recharge.operatorRef = operatorRef ?? null
  recharge.resolvedAt = Date.now()

  if (status === 'confirmed') {
    creditWallet({
      walletUserId: recharge.userId,
      type: 'recharge',
      amount: recharge.amount,
      reference: recharge.id,
    })
  }

  return recharge
}
