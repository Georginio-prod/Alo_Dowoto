<script setup lang="ts">
import { SECTORS } from '~~/app/data/sectors'

/** Liste des prestataires (#dashboard-admin, module 2). */
definePageMeta({ layout: 'admin', middleware: 'auth', authRole: 'admin' })

interface ProviderSummary {
  id: string
  name: string
  contact: string
  createdAt: number
  status: 'active' | 'suspended'
  riskFlag: boolean
  city: string | null
  sector: string | null
  subscriptionStatus: string
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected'
  rating: number
  reviewCount: number
}

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

const page = ref(1)
const pageSize = 20
const statusFilter = ref('')
const sectorFilter = ref('')
const cityFilter = ref('')
const subscriptionFilter = ref('')
const kycFilter = ref(typeof route.query.kyc === 'string' ? route.query.kyc : '')
const searchQuery = ref('')

const query = computed(() => ({
  page: page.value,
  pageSize,
  ...(statusFilter.value ? { status: statusFilter.value } : {}),
  ...(sectorFilter.value ? { sector: sectorFilter.value } : {}),
  ...(cityFilter.value ? { city: cityFilter.value } : {}),
  ...(subscriptionFilter.value ? { subscriptionStatus: subscriptionFilter.value } : {}),
  ...(kycFilter.value ? { kycStatus: kycFilter.value } : {}),
  ...(searchQuery.value ? { q: searchQuery.value } : {}),
}))

const { data, pending, error } = await useFetch<{ providers: ProviderSummary[], total: number }>('/api/admin/providers', { query })

watch([statusFilter, sectorFilter, cityFilter, subscriptionFilter, kycFilter, searchQuery], () => { page.value = 1 })

const KYC_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = { none: 'neutral', pending: 'warning', approved: 'success', rejected: 'danger' }
const KYC_LABEL = computed<Record<string, string>>(() => ({
  none: t('admin.providers.kycNone'),
  pending: t('admin.providers.kycPending'),
  approved: t('admin.providers.kycApproved'),
  rejected: t('admin.providers.kycRejected'),
}))
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.providers.title') }}</h1>

    <div class="mb-4 flex flex-wrap gap-2">
      <input
        v-model="searchQuery"
        type="search"
        :placeholder="t('admin.common.search')"
        class="h-9 min-w-0 flex-1 rounded-field border border-hairline bg-white px-3 text-[12.5px] text-dark sm:max-w-[220px]"
      >
      <select v-model="statusFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.providers.filterStatus') }}</option>
        <option value="active">{{ t('admin.providers.statusActive') }}</option>
        <option value="suspended">{{ t('admin.providers.statusSuspended') }}</option>
      </select>
      <select v-model="sectorFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.providers.filterSector') }}</option>
        <option v-for="sector in SECTORS" :key="sector.slug" :value="sector.slug">{{ sector.name }}</option>
      </select>
      <input
        v-model="cityFilter"
        type="text"
        :placeholder="t('admin.providers.filterCity')"
        class="h-9 w-[130px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark"
      >
      <select v-model="subscriptionFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.providers.filterSubscription') }}</option>
        <option value="actif">{{ t('admin.providers.subscriptionActive') }}</option>
        <option value="en_attente">{{ t('admin.providers.subscriptionPending') }}</option>
        <option value="expire">{{ t('admin.providers.subscriptionExpired') }}</option>
        <option value="aucun">{{ t('admin.providers.subscriptionNone') }}</option>
      </select>
      <select v-model="kycFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.providers.filterKyc') }}</option>
        <option value="pending">{{ t('admin.providers.kycPending') }}</option>
        <option value="approved">{{ t('admin.providers.kycApproved') }}</option>
        <option value="rejected">{{ t('admin.providers.kycRejected') }}</option>
        <option value="none">{{ t('admin.providers.kycNone') }}</option>
      </select>
    </div>

    <div class="overflow-hidden rounded-card border border-hairline bg-surface shadow-card-sm">
      <p v-if="pending" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
      <p v-else-if="error" class="p-5 text-center text-[13px] text-error">{{ t('admin.common.error') }}</p>
      <p v-else-if="data?.providers.length === 0" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.empty') }}</p>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[820px] border-collapse text-[12.5px]">
          <thead>
            <tr class="border-b border-hairline text-left text-muted">
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.providers.colName') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.providers.colSector') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.providers.colCity') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.providers.colSubscription') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.providers.colKyc') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.providers.colRating') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.common.status') }}</th>
              <th class="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="provider in data?.providers" :key="provider.id" class="border-b border-hairline last:border-0 hover:bg-bg">
              <td class="px-4 py-2.5 font-semibold text-dark">
                {{ provider.name }}
                <span v-if="provider.riskFlag" class="ml-1" :title="t('admin.providers.riskFlagTitle')">⚠️</span>
              </td>
              <td class="px-4 py-2.5 text-muted">{{ provider.sector ?? '—' }}</td>
              <td class="px-4 py-2.5 text-muted">{{ provider.city ?? '—' }}</td>
              <td class="px-4 py-2.5 text-muted">{{ provider.subscriptionStatus }}</td>
              <td class="px-4 py-2.5"><AdminBadge :tone="KYC_TONE[provider.kycStatus]">{{ KYC_LABEL[provider.kycStatus] }}</AdminBadge></td>
              <td class="px-4 py-2.5 text-muted">{{ provider.reviewCount > 0 ? `${provider.rating} (${provider.reviewCount})` : '—' }}</td>
              <td class="px-4 py-2.5">
                <AdminBadge :tone="provider.status === 'active' ? 'success' : 'danger'">
                  {{ provider.status === 'active' ? t('admin.providers.statusActive') : t('admin.providers.statusSuspended') }}
                </AdminBadge>
              </td>
              <td class="px-4 py-2.5 text-right">
                <NuxtLink :to="`/admin/prestataires/${provider.id}`" class="press font-semibold text-primary">{{ t('admin.common.viewDetail') }}</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminPagination v-if="data && data.total > 0" :page="page" :page-size="pageSize" :total="data.total" @update:page="(p) => (page = p)" />
    </div>
  </div>
</template>
