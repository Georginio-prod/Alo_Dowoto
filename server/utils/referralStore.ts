import { randomBytes } from 'node:crypto'
import type { Referral as PrismaReferral, ReferralStatus } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { creditWallet } from '~~/server/utils/walletStore'

/**
 * Programme de parrainage (#365) : un filleul n'a jamais qu'un seul parrain
 * (`referredId` unique côté schéma). Décisions produit validées avec
 * l'utilisateur avant implémentation :
 * - Bénéficiaires : le parrain ET le filleul sont crédités (pas seulement
 *   le parrain).
 * - Déclencheur : le premier paiement RÉEL du filleul (paiement d'abonnement
 *   confirmé ou premier paiement en séquestre) — jamais à l'inscription,
 *   pour limiter la fraude aux faux comptes.
 * - Montant : 500 FCFA chacun, volontairement conservateur tant que le
 *   programme n'est pas éprouvé.
 */

export const REFERRAL_BONUS_AMOUNT = 500

/** Exclut les caractères ambigus (0/O, 1/I/L) pour un code lisible à l'oral/à l'écrit. */
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const MAX_GENERATION_ATTEMPTS = 10

function randomCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (const byte of bytes) {
    code += CODE_CHARSET[byte % CODE_CHARSET.length]
  }
  return code
}

/**
 * Génère un code de parrainage unique. L'espace de codes (32^6 ≈ 1,07
 * milliard) rend une collision quasi improbable ; quelques tentatives
 * suffisent largement plutôt qu'une contrainte d'unicité gérée en base.
 */
async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = randomCode()
    const existing = await prisma.user.findUnique({ where: { referralCode: code } })
    if (!existing) return code
  }
  throw new Error('Impossible de générer un code de parrainage unique.')
}

/**
 * Renvoie le code de parrainage d'un utilisateur, en le générant à la volée
 * s'il n'en a pas encore (comptes créés avant #365, ou tout compte qui n'a
 * jamais visité sa page de parrainage) — évite une migration de données
 * rétroactive pour un simple code d'affichage.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Utilisateur introuvable.')
  if (user.referralCode) return user.referralCode

  const code = await generateUniqueReferralCode()
  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
  return code
}

/** Retrouve l'id du parrain à partir d'un code saisi à l'inscription — `null` si le code est invalide. */
export async function findUserIdByReferralCode(code: string): Promise<string | null> {
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) return null
  const user = await prisma.user.findUnique({ where: { referralCode: trimmed } })
  return user?.id ?? null
}

export interface Referral {
  id: string
  referrerId: string
  referredId: string
  status: ReferralStatus
  createdAt: number
  rewardedAt: number | null
}

function toReferral(row: PrismaReferral): Referral {
  return {
    id: row.id,
    referrerId: row.referrerId,
    referredId: row.referredId,
    status: row.status,
    createdAt: row.createdAt.getTime(),
    rewardedAt: row.rewardedAt?.getTime() ?? null,
  }
}

/**
 * Enregistre un parrainage à l'inscription — appelé uniquement à la création
 * d'un nouveau compte quand un code de parrainage valide a été fourni.
 * Auto-parrainage impossible par construction : le compte n'existe pas
 * encore au moment où son propre code serait vérifié.
 */
export async function createReferral(referrerId: string, referredId: string): Promise<void> {
  await prisma.referral.create({ data: { referrerId, referredId } })
}

/** Parrainages faits par un utilisateur (#365, tableau de suivi), du plus récent au plus ancien. */
export async function listReferralsByReferrer(referrerId: string): Promise<Referral[]> {
  const rows = await prisma.referral.findMany({ where: { referrerId }, orderBy: { createdAt: 'desc' } })
  return rows.map(toReferral)
}

export type RewardReferralResult =
  | { rewarded: true; referrerId: string }
  | { rewarded: false }

/**
 * Récompense le parrainage au premier paiement réel du filleul. Idempotent
 * et atomique : la transition `pending -> rewarded` est conditionnée par
 * `updateMany({ where: { status: 'pending' } })` (même principe que
 * `resolvePayment`, paymentStore.ts) — un double appel concurrent (webhook
 * rejoué, deux paiements presque simultanés) ne peut jamais créditer deux
 * fois. Appelé après confirmation d'un paiement d'abonnement ET après un
 * paiement en séquestre réussi : peu importe lequel arrive en premier, seul
 * le tout premier fait passer le parrainage de `pending` à `rewarded`.
 */
export async function rewardReferralIfPending(referredUserId: string): Promise<RewardReferralResult> {
  const referral = await prisma.referral.findUnique({ where: { referredId: referredUserId } })
  if (!referral || referral.status !== 'pending') return { rewarded: false }

  const result = await prisma.referral.updateMany({
    where: { id: referral.id, status: 'pending' },
    data: { status: 'rewarded', rewardedAt: new Date() },
  })
  if (result.count === 0) return { rewarded: false }

  await creditWallet({
    walletUserId: referral.referrerId,
    type: 'referral_bonus',
    amount: REFERRAL_BONUS_AMOUNT,
    reference: referral.id,
    counterpartyUserId: referral.referredId,
  })
  await creditWallet({
    walletUserId: referral.referredId,
    type: 'referral_bonus',
    amount: REFERRAL_BONUS_AMOUNT,
    reference: referral.id,
    counterpartyUserId: referral.referrerId,
  })

  return { rewarded: true, referrerId: referral.referrerId }
}
