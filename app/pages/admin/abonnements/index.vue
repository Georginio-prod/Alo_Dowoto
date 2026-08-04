<script setup lang="ts">
/** Abonnements & tarification (#dashboard-admin, module 7). */
definePageMeta({ layout: 'admin', middleware: 'auth', authRole: 'admin' })

interface Plan { id: string, slug: string, name: string, priceAmount: number, durationDays: number, commissionRate: number, features: string, active: boolean }
interface Coupon { id: string, code: string, discountType: string, discountValue: number, active: boolean, usageCount: number, usageLimit: number | null }
interface Settings { minAdvanceAmount: number, commissionRate: number }

const { t } = useI18n({ useScope: 'global' })

const { data: plansData, refresh: refreshPlans } = await useFetch<{ plans: Plan[] }>('/api/admin/plans')
const { data: couponsData, refresh: refreshCoupons } = await useFetch<{ coupons: Coupon[] }>('/api/admin/coupons')
const { data: settingsData, refresh: refreshSettings } = await useFetch<{ settings: Settings }>('/api/admin/settings')

const busy = ref(false)
const toast = ref('')
async function withBusy(action: () => Promise<void>) {
  busy.value = true
  try { await action() } catch (err) { toast.value = err instanceof Error ? err.message : t('admin.common.error') } finally { busy.value = false }
}

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}

// New plan form
const newPlan = ref({ slug: '', name: '', priceAmount: 5000, durationDays: 30, commissionRate: 0.1, features: '' })
async function createPlan() {
  await withBusy(async () => {
    await $fetch('/api/admin/plans', { method: 'POST', body: newPlan.value })
    newPlan.value = { slug: '', name: '', priceAmount: 5000, durationDays: 30, commissionRate: 0.1, features: '' }
    await refreshPlans()
  })
}
async function togglePlan(plan: Plan) {
  await withBusy(async () => { await $fetch(`/api/admin/plans/${plan.id}/toggle`, { method: 'POST', body: { active: !plan.active } }); await refreshPlans() })
}

// New coupon
const newCoupon = ref({ code: '', discountType: 'percent' as 'percent' | 'amount', discountValue: 10 })
async function createCoupon() {
  await withBusy(async () => {
    await $fetch('/api/admin/coupons', { method: 'POST', body: newCoupon.value })
    newCoupon.value = { code: '', discountType: 'percent', discountValue: 10 }
    await refreshCoupons()
  })
}
async function toggleCoupon(coupon: Coupon) {
  await withBusy(async () => { await $fetch(`/api/admin/coupons/${coupon.id}/toggle`, { method: 'POST', body: { active: !coupon.active } }); await refreshCoupons() })
}

// Settings (commission + min advance)
const commissionPercent = ref(10)
const minAdvance = ref(1000)
watchEffect(() => {
  if (settingsData.value?.settings) {
    commissionPercent.value = Math.round(settingsData.value.settings.commissionRate * 100)
    minAdvance.value = settingsData.value.settings.minAdvanceAmount
  }
})
async function saveSettings() {
  await withBusy(async () => {
    await $fetch('/api/admin/settings', { method: 'PATCH', body: { commissionRate: commissionPercent.value / 100, minAdvanceAmount: minAdvance.value } })
    await refreshSettings()
  })
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.plans.title') }}</h1>
    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.plans.globalSettingsTitle') }}</h2>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.plans.commissionRate') }}</label>
          <input v-model.number="commissionPercent" type="number" min="0" max="100" class="h-9 w-[100px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        </div>
        <div>
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.plans.minAdvance') }}</label>
          <input v-model.number="minAdvance" type="number" min="0" class="h-9 w-[140px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        </div>
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy" @click="saveSettings">
          {{ t('admin.common.save') }}
        </button>
      </div>
    </section>

    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.plans.plansTitle') }}</h2>
      <table v-if="plansData?.plans.length" class="mb-4 w-full min-w-[600px] border-collapse text-[12.5px]">
        <thead>
          <tr class="border-b border-hairline text-left text-muted">
            <th class="py-2 font-semibold">{{ t('admin.plans.colName') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.plans.colPrice') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.plans.colDuration') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.plans.commissionRate') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.common.status') }}</th>
            <th class="py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="plan in plansData.plans" :key="plan.id" class="border-b border-hairline last:border-0">
            <td class="py-2 text-dark">{{ plan.name }}</td>
            <td class="py-2 text-muted">{{ money(plan.priceAmount) }}</td>
            <td class="py-2 text-muted">{{ plan.durationDays }} j</td>
            <td class="py-2 text-muted">{{ Math.round(plan.commissionRate * 100) }}%</td>
            <td class="py-2"><AdminBadge :tone="plan.active ? 'success' : 'neutral'">{{ plan.active ? t('admin.providers.statusActive') : t('admin.plans.disabled') }}</AdminBadge></td>
            <td class="py-2 text-right">
              <button type="button" class="press font-semibold text-primary disabled:opacity-60" :disabled="busy" @click="togglePlan(plan)">
                {{ plan.active ? t('admin.plans.disableCta') : t('admin.plans.enableCta') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="mb-4 text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>

      <div class="flex flex-wrap items-end gap-2">
        <input v-model="newPlan.slug" type="text" :placeholder="t('admin.plans.slugPlaceholder')" class="h-9 w-[110px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="newPlan.name" type="text" :placeholder="t('admin.plans.namePlaceholder')" class="h-9 w-[140px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model.number="newPlan.priceAmount" type="number" :placeholder="t('admin.plans.colPrice')" class="h-9 w-[100px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model.number="newPlan.durationDays" type="number" :placeholder="t('admin.plans.colDuration')" class="h-9 w-[90px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="newPlan.features" type="text" :placeholder="t('admin.plans.featuresPlaceholder')" class="h-9 min-w-[160px] flex-1 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy || !newPlan.slug || !newPlan.name" @click="createPlan">
          {{ t('admin.common.create') }}
        </button>
      </div>
    </section>

    <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.plans.couponsTitle') }}</h2>
      <table v-if="couponsData?.coupons.length" class="mb-4 w-full min-w-[500px] border-collapse text-[12.5px]">
        <thead>
          <tr class="border-b border-hairline text-left text-muted">
            <th class="py-2 font-semibold">{{ t('admin.plans.colCode') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.plans.colDiscount') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.plans.colUsage') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.common.status') }}</th>
            <th class="py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="coupon in couponsData.coupons" :key="coupon.id" class="border-b border-hairline last:border-0">
            <td class="py-2 font-semibold text-dark">{{ coupon.code }}</td>
            <td class="py-2 text-muted">{{ coupon.discountType === 'percent' ? `${coupon.discountValue}%` : money(coupon.discountValue) }}</td>
            <td class="py-2 text-muted">{{ coupon.usageCount }}{{ coupon.usageLimit ? ` / ${coupon.usageLimit}` : '' }}</td>
            <td class="py-2"><AdminBadge :tone="coupon.active ? 'success' : 'neutral'">{{ coupon.active ? t('admin.providers.statusActive') : t('admin.plans.disabled') }}</AdminBadge></td>
            <td class="py-2 text-right">
              <button type="button" class="press font-semibold text-primary disabled:opacity-60" :disabled="busy" @click="toggleCoupon(coupon)">
                {{ coupon.active ? t('admin.plans.disableCta') : t('admin.plans.enableCta') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="mb-4 text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>

      <div class="flex flex-wrap items-end gap-2">
        <input v-model="newCoupon.code" type="text" :placeholder="t('admin.plans.colCode')" class="h-9 w-[120px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <select v-model="newCoupon.discountType" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
          <option value="percent">%</option>
          <option value="amount">F CFA</option>
        </select>
        <input v-model.number="newCoupon.discountValue" type="number" class="h-9 w-[100px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy || !newCoupon.code" @click="createCoupon">
          {{ t('admin.common.create') }}
        </button>
      </div>
    </section>
  </div>
</template>
