import { prisma } from '~~/server/utils/prisma'

/**
 * Formules d'abonnement et codes promo éditables depuis /admin
 * (#dashboard-admin, module 7) — CRUD réel sur SubscriptionPlanConfig/Coupon
 * (tables jusque-là inexistantes). Le checkout réel (server/api/subscriptions,
 * /abonnement) continue de lire app/data/plans.ts (PLANS, statique) —
 * rebrancher dessus est un chantier séparé, voir docs/admin-dashboard.md.
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

export async function listPlanConfigs() {
  return prisma.subscriptionPlanConfig.findMany({ orderBy: { priceAmount: 'asc' } })
}

export async function createPlanConfig(input: PlanConfigInput) {
  return prisma.subscriptionPlanConfig.create({ data: input })
}

export async function updatePlanConfig(id: string, input: Partial<PlanConfigInput>) {
  return prisma.subscriptionPlanConfig.update({ where: { id }, data: input })
}

export async function setPlanConfigActive(id: string, active: boolean) {
  return prisma.subscriptionPlanConfig.update({ where: { id }, data: { active } })
}

export interface CouponInput {
  code: string
  discountType: 'percent' | 'amount'
  discountValue: number
  expiresAt?: number
  usageLimit?: number
}

export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createCoupon(input: CouponInput) {
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

export async function setCouponActive(id: string, active: boolean) {
  return prisma.coupon.update({ where: { id }, data: { active } })
}
