import type { Coupon, SubscriptionPlanConfig } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Formules d'abonnement et codes promo éditables depuis /admin (#dashboard-admin,
 * module 7), portés iso depuis `server/utils/adminPlanStore.ts` (ADR-0017) — CRUD
 * réel sur `SubscriptionPlanConfig`/`Coupon`. Le checkout réel continue de lire
 * la config statique (`data/plans.ts`) : rebrancher dessus est un chantier séparé.
 * Les lignes Prisma sont renvoyées telles quelles (dates → ISO en JSON, iso Nitro).
 */

export interface PlanConfigInput {
  slug: string
  name: string
  priceAmount: number
  durationDays: number
  commissionRate: number
  features: string
  active: boolean
}

export function listPlanConfigs(): Promise<SubscriptionPlanConfig[]> {
  return prisma.subscriptionPlanConfig.findMany({ orderBy: { priceAmount: 'asc' } })
}

export function createPlanConfig(input: PlanConfigInput): Promise<SubscriptionPlanConfig> {
  return prisma.subscriptionPlanConfig.create({ data: input })
}

export function updatePlanConfig(id: string, input: Partial<PlanConfigInput>): Promise<SubscriptionPlanConfig> {
  return prisma.subscriptionPlanConfig.update({ where: { id }, data: input })
}

export function setPlanConfigActive(id: string, active: boolean): Promise<SubscriptionPlanConfig> {
  return prisma.subscriptionPlanConfig.update({ where: { id }, data: { active } })
}

export interface CouponInput {
  code: string
  discountType: 'percent' | 'amount'
  discountValue: number
  expiresAt?: number
  usageLimit?: number
}

export function listCoupons(): Promise<Coupon[]> {
  return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
}

export function createCoupon(input: CouponInput): Promise<Coupon> {
  return prisma.coupon.create({
    data: {
      code: input.code.toUpperCase(),
      discountType: input.discountType,
      discountValue: input.discountValue,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      usageLimit: input.usageLimit ?? null,
    },
  })
}

export function setCouponActive(id: string, active: boolean): Promise<Coupon> {
  return prisma.coupon.update({ where: { id }, data: { active } })
}
