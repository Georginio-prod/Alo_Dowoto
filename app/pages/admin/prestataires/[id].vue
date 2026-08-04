<script setup lang="ts">
import { SECTORS } from '~~/app/data/sectors'
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

/** Fiche détaillée d'un prestataire (#dashboard-admin, module 2). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface ProviderDetail {
  user: { id: string, contact: string, firstName: string, lastName: string, username: string, location: string, status: 'active' | 'suspended', suspendedReason?: string, riskFlag: boolean, riskNote?: string, createdAt: number }
  profile: { displayName: string, sector: string, city?: string, latitude?: number, longitude?: number, quartier?: string, rayonInterventionKm?: number, description?: string } | null
  subscription: { status: string, plan: string, dateDebut: number | null, dateFin: number | null } | null
  kyc: { status: 'none' | 'pending' | 'approved' | 'rejected', hasSubmission: boolean, decisions: { id: string, status: string, reason: string | null, reviewedBy: string, reviewedAt: number }[] }
  missions: { id: string, status: string, amount: number, createdAt: number, clientId: string }[]
  reviews: { id: string, rating: number, comment: string | null, createdAt: number }[]
  revenueGenerated: number
  reportsReceived: number
}

const route = useRoute()
const id = route.params.id as string
const { t } = useI18n({ useScope: 'global' })

const { data, pending, error, refresh } = await useFetch<{ provider: ProviderDetail }>(`/api/admin/providers/${id}`)
const provider = computed(() => data.value?.provider ?? null)

const mapProviders = computed<ProviderSearchResult[]>(() => {
  const p = provider.value
  if (!p?.profile?.latitude || !p.profile.longitude) return []
  return [{
    id: p.user.id,
    displayName: p.profile.displayName,
    sector: p.profile.sector,
    subSector: p.profile.sector,
    city: p.profile.city ?? '',
    verified: p.kyc.status === 'approved',
    rating: 0,
    reviewCount: 0,
    priceFrom: 0,
    photoUrl: null,
    latitude: p.profile.latitude,
    longitude: p.profile.longitude,
    quartier: p.profile.quartier ?? null,
    distanceKm: null,
  }]
})

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}
function formatDate(ts: number | null): string {
  return ts ? new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

// --- Actions ---
const busy = ref(false)
const toast = ref('')

async function withBusy(action: () => Promise<void>) {
  busy.value = true
  try {
    await action()
    await refresh()
  } catch (err) {
    toast.value = err instanceof Error ? err.message : t('admin.common.error')
  } finally {
    busy.value = false
  }
}

// KYC
const kycRejectOpen = ref(false)
async function approveKyc() {
  await withBusy(async () => { await $fetch(`/api/admin/providers/${id}/kyc-approve`, { method: 'POST', body: {} }) })
}
async function rejectKyc(reason?: string) {
  kycRejectOpen.value = false
  if (!reason) return
  await withBusy(async () => { await $fetch(`/api/admin/providers/${id}/kyc-reject`, { method: 'POST', body: { reason } }) })
}

// Suspend / reactivate
const suspendOpen = ref(false)
async function suspend(reason?: string) {
  suspendOpen.value = false
  if (!reason) return
  await withBusy(async () => { await $fetch(`/api/admin/users/${id}/suspend`, { method: 'POST', body: { reason } }) })
}
async function reactivate() {
  await withBusy(async () => { await $fetch(`/api/admin/users/${id}/reactivate`, { method: 'POST' }) })
}

// Subscription
const extendDays = ref(30)
async function extendSubscription() {
  await withBusy(async () => { await $fetch(`/api/admin/providers/${id}/subscription-extend`, { method: 'POST', body: { durationDays: extendDays.value } }) })
}
const cancelSubOpen = ref(false)
async function cancelSubscription() {
  cancelSubOpen.value = false
  await withBusy(async () => { await $fetch(`/api/admin/providers/${id}/subscription-cancel`, { method: 'POST' }) })
}

// Categories / zone
const sectorEdit = ref('')
watchEffect(() => { if (provider.value?.profile) sectorEdit.value = provider.value.profile.sector })
async function saveSector() {
  await withBusy(async () => { await $fetch(`/api/admin/providers/${id}/categories`, { method: 'PATCH', body: { sector: sectorEdit.value } }) })
}

const zoneCity = ref('')
const zoneQuartier = ref('')
const zoneLat = ref<number | undefined>(undefined)
const zoneLng = ref<number | undefined>(undefined)
const zoneRadius = ref<number | undefined>(undefined)
watchEffect(() => {
  if (provider.value?.profile) {
    zoneCity.value = provider.value.profile.city ?? ''
    zoneQuartier.value = provider.value.profile.quartier ?? ''
    zoneLat.value = provider.value.profile.latitude
    zoneLng.value = provider.value.profile.longitude
    zoneRadius.value = provider.value.profile.rayonInterventionKm
  }
})
async function saveZone() {
  await withBusy(async () => {
    await $fetch(`/api/admin/providers/${id}/zone`, {
      method: 'PATCH',
      body: { city: zoneCity.value || undefined, quartier: zoneQuartier.value || undefined, latitude: zoneLat.value, longitude: zoneLng.value, rayonInterventionKm: zoneRadius.value },
    })
  })
}

// Message
const messageOpen = ref(false)
const messageSubject = ref('')
const messageBody = ref('')
async function sendMessage() {
  await withBusy(async () => {
    await $fetch(`/api/admin/users/${id}/message`, { method: 'POST', body: { subject: messageSubject.value, body: messageBody.value } })
    messageOpen.value = false
    messageSubject.value = ''
    messageBody.value = ''
  })
}

// Delete
const deleteOpen = ref(false)
async function deleteAccount() {
  deleteOpen.value = false
  await withBusy(async () => { await $fetch(`/api/admin/users/${id}/delete`, { method: 'POST', body: {} }) })
  navigateTo('/admin/prestataires')
}

const KYC_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = { none: 'neutral', pending: 'warning', approved: 'success', rejected: 'danger' }
</script>

<template>
  <div>
    <NuxtLink to="/admin/prestataires" class="mb-3 inline-block text-[12.5px] font-semibold text-muted hover:text-dark">← {{ t('admin.common.back') }}</NuxtLink>

    <p v-if="pending" class="text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
    <p v-else-if="error" class="text-[13px] text-error">{{ t('admin.common.error') }}</p>

    <template v-else-if="provider">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-[19px] font-extrabold text-dark">{{ provider.profile?.displayName ?? [provider.user.firstName, provider.user.lastName].join(' ') }}</h1>
          <p class="text-[12.5px] text-muted">{{ provider.user.contact }} · {{ t('admin.providers.memberSince') }} {{ formatDate(provider.user.createdAt) }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AdminBadge :tone="provider.user.status === 'active' ? 'success' : 'danger'">{{ provider.user.status === 'active' ? t('admin.providers.statusActive') : t('admin.providers.statusSuspended') }}</AdminBadge>
          <AdminBadge v-if="provider.user.riskFlag" tone="warning">{{ t('admin.providers.riskFlagTitle') }}</AdminBadge>
        </div>
      </div>

      <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="flex flex-col gap-4 lg:col-span-2">
          <!-- KYC -->
          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-[13.5px] font-bold text-dark">{{ t('admin.providers.kycTitle') }}</h2>
              <AdminBadge :tone="KYC_TONE[provider.kyc.status]">{{ t(`admin.providers.kyc${provider.kyc.status.charAt(0).toUpperCase()}${provider.kyc.status.slice(1)}`) }}</AdminBadge>
            </div>
            <p class="mb-3 text-[12.5px] text-muted">{{ provider.kyc.hasSubmission ? t('admin.providers.kycSubmitted') : t('admin.providers.kycNotSubmitted') }}</p>
            <div v-if="provider.kyc.hasSubmission" class="mb-3 flex gap-2">
              <button type="button" class="press rounded-field bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy" @click="approveKyc">
                {{ t('admin.providers.kycApproveCta') }}
              </button>
              <button type="button" class="press rounded-field border border-error px-3.5 py-2 text-[12.5px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="kycRejectOpen = true">
                {{ t('admin.providers.kycRejectCta') }}
              </button>
            </div>
            <ul v-if="provider.kyc.decisions.length > 0" class="flex flex-col gap-1.5 border-t border-hairline pt-2.5 text-[11.5px] text-muted">
              <li v-for="decision in provider.kyc.decisions" :key="decision.id">
                {{ decision.status }} — {{ formatDate(decision.reviewedAt) }}<template v-if="decision.reason"> · {{ decision.reason }}</template>
              </li>
            </ul>
          </section>

          <!-- Catégories & zone -->
          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.providers.categoriesZoneTitle') }}</h2>
            <div class="mb-3 flex flex-wrap items-end gap-2">
              <div>
                <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.filterSector') }}</label>
                <select v-model="sectorEdit" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
                  <option v-for="sector in SECTORS" :key="sector.slug" :value="sector.slug">{{ sector.name }}</option>
                </select>
              </div>
              <button type="button" class="press h-9 rounded-field border border-hairline bg-white px-3.5 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="saveSector">
                {{ t('admin.common.save') }}
              </button>
            </div>
            <div class="flex flex-wrap items-end gap-2">
              <div>
                <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.filterCity') }}</label>
                <input v-model="zoneCity" type="text" class="h-9 w-[130px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
              </div>
              <div>
                <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneQuartier') }}</label>
                <input v-model="zoneQuartier" type="text" class="h-9 w-[130px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
              </div>
              <div>
                <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneLat') }}</label>
                <input v-model.number="zoneLat" type="number" step="0.0001" class="h-9 w-[110px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
              </div>
              <div>
                <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneLng') }}</label>
                <input v-model.number="zoneLng" type="number" step="0.0001" class="h-9 w-[110px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
              </div>
              <div>
                <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneRadius') }}</label>
                <input v-model.number="zoneRadius" type="number" min="1" class="h-9 w-[90px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
              </div>
              <button type="button" class="press h-9 rounded-field border border-hairline bg-white px-3.5 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="saveZone">
                {{ t('admin.common.save') }}
              </button>
            </div>
            <ClientOnly>
              <div v-if="mapProviders.length > 0" class="mt-3 h-[220px] overflow-hidden rounded-field border border-hairline">
                <ProviderMap :providers="mapProviders" />
              </div>
            </ClientOnly>
          </section>

          <!-- Missions -->
          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.providers.missionsTitle') }}</h2>
            <p v-if="provider.missions.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="mission in provider.missions" :key="mission.id" class="flex items-center justify-between py-2 text-[12.5px]">
                <NuxtLink :to="`/admin/missions/${mission.id}`" class="font-semibold text-primary">{{ mission.id.slice(0, 8) }}</NuxtLink>
                <span class="text-muted">{{ mission.status }}</span>
                <span class="text-dark">{{ money(mission.amount) }}</span>
              </li>
            </ul>
          </section>

          <!-- Reviews -->
          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.providers.reviewsTitle') }}</h2>
            <p v-if="provider.reviews.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="review in provider.reviews" :key="review.id" class="py-2 text-[12.5px]">
                <span class="font-semibold text-dark">{{ '★'.repeat(review.rating) }}</span>
                <span v-if="review.comment" class="ml-2 text-muted">{{ review.comment }}</span>
              </li>
            </ul>
          </section>
        </div>

        <div class="flex flex-col gap-4">
          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.providers.statsTitle') }}</h2>
            <dl class="flex flex-col gap-2 text-[12.5px]">
              <div class="flex justify-between"><dt class="text-muted">{{ t('admin.providers.revenueGenerated') }}</dt><dd class="font-semibold text-dark">{{ money(provider.revenueGenerated) }}</dd></div>
              <div class="flex justify-between"><dt class="text-muted">{{ t('admin.providers.reportsReceived') }}</dt><dd class="font-semibold text-dark">{{ provider.reportsReceived }}</dd></div>
            </dl>
          </section>

          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.providers.subscriptionTitle') }}</h2>
            <p class="mb-1 text-[12.5px] text-dark">{{ provider.subscription?.plan ?? '—' }} · {{ provider.subscription?.status ?? t('admin.providers.subscriptionNone') }}</p>
            <p class="mb-3 text-[11.5px] text-muted">{{ formatDate(provider.subscription?.dateDebut ?? null) }} → {{ formatDate(provider.subscription?.dateFin ?? null) }}</p>
            <div class="flex items-center gap-2">
              <input v-model.number="extendDays" type="number" min="1" class="h-9 w-[80px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
              <button type="button" class="press h-9 rounded-field border border-hairline bg-white px-3 text-[12px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="extendSubscription">
                {{ t('admin.providers.extendCta') }}
              </button>
            </div>
            <button type="button" class="press mt-2 text-[12px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="cancelSubOpen = true">
              {{ t('admin.providers.cancelSubscriptionCta') }}
            </button>
          </section>

          <section class="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-1 text-[13.5px] font-bold text-dark">{{ t('admin.common.actions') }}</h2>
            <button v-if="provider.user.status === 'active'" type="button" class="press rounded-field border border-error px-3.5 py-2 text-[12.5px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="suspendOpen = true">
              {{ t('admin.providers.suspendCta') }}
            </button>
            <button v-else type="button" class="press rounded-field bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy" @click="reactivate">
              {{ t('admin.providers.reactivateCta') }}
            </button>
            <button type="button" class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="messageOpen = true">
              {{ t('admin.providers.messageCta') }}
            </button>
            <button type="button" class="press rounded-field border border-error bg-error/5 px-3.5 py-2 text-[12.5px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="deleteOpen = true">
              {{ t('admin.providers.deleteCta') }}
            </button>
          </section>
        </div>
      </div>
    </template>

    <AdminConfirmModal
      :open="kycRejectOpen"
      :title="t('admin.providers.kycRejectCta')"
      require-reason
      danger
      :loading="busy"
      @confirm="rejectKyc"
      @cancel="kycRejectOpen = false"
    />
    <AdminConfirmModal
      :open="suspendOpen"
      :title="t('admin.providers.suspendCta')"
      require-reason
      danger
      :loading="busy"
      @confirm="suspend"
      @cancel="suspendOpen = false"
    />
    <AdminConfirmModal
      :open="cancelSubOpen"
      :title="t('admin.providers.cancelSubscriptionCta')"
      danger
      :loading="busy"
      @confirm="cancelSubscription"
      @cancel="cancelSubOpen = false"
    />
    <AdminConfirmModal
      :open="deleteOpen"
      :title="t('admin.providers.deleteCta')"
      :description="t('admin.providers.deleteWarning')"
      danger
      :loading="busy"
      @confirm="deleteAccount"
      @cancel="deleteOpen = false"
    />

    <div v-if="messageOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" @click.self="messageOpen = false">
      <div class="w-full max-w-[420px] rounded-card border border-hairline bg-surface p-5 shadow-card-lg">
        <p class="mb-3 text-[15px] font-bold text-dark">{{ t('admin.providers.messageCta') }}</p>
        <input v-model="messageSubject" type="text" :placeholder="t('admin.providers.messageSubject')" class="mb-2 w-full rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark">
        <textarea v-model="messageBody" rows="4" :placeholder="t('admin.providers.messageBody')" class="mb-3 w-full resize-none rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark" />
        <div class="flex justify-end gap-2">
          <button type="button" class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted" @click="messageOpen = false">{{ t('admin.confirmModal.cancel') }}</button>
          <button type="button" class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60" :disabled="busy || !messageSubject || !messageBody" @click="sendMessage">
            {{ t('admin.providers.messageSend') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
