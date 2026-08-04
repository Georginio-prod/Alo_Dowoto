<script setup lang="ts">
/** Liste des chercheurs (#dashboard-admin, module 3). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface ClientSummary {
  id: string
  name: string
  contact: string
  status: 'active' | 'suspended'
  riskFlag: boolean
  location: string
  requestsCount: number
  paidMissionsCount: number
  openDisputesCount: number
}

const { t } = useI18n({ useScope: 'global' })

const page = ref(1)
const pageSize = 20
const statusFilter = ref('')
const riskFilter = ref(false)
const searchQuery = ref('')

const query = computed(() => ({
  page: page.value,
  pageSize,
  ...(statusFilter.value ? { status: statusFilter.value } : {}),
  ...(riskFilter.value ? { risk: '1' } : {}),
  ...(searchQuery.value ? { q: searchQuery.value } : {}),
}))

const { data, pending, error } = await useFetch<{ clients: ClientSummary[], total: number }>('/api/admin/clients', { query })
watch([statusFilter, riskFilter, searchQuery], () => { page.value = 1 })
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.clients.title') }}</h1>

    <div class="mb-4 flex flex-wrap gap-2">
      <input v-model="searchQuery" type="search" :placeholder="t('admin.common.search')" class="h-9 min-w-0 flex-1 rounded-field border border-hairline bg-white px-3 text-[12.5px] text-dark sm:max-w-[220px]">
      <select v-model="statusFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.providers.filterStatus') }}</option>
        <option value="active">{{ t('admin.providers.statusActive') }}</option>
        <option value="suspended">{{ t('admin.providers.statusSuspended') }}</option>
      </select>
      <label class="flex h-9 items-center gap-1.5 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="riskFilter" type="checkbox">
        {{ t('admin.clients.filterRisk') }}
      </label>
    </div>

    <div class="overflow-hidden rounded-card border border-hairline bg-surface shadow-card-sm">
      <p v-if="pending" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
      <p v-else-if="error" class="p-5 text-center text-[13px] text-error">{{ t('admin.common.error') }}</p>
      <p v-else-if="data?.clients.length === 0" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.empty') }}</p>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead>
            <tr class="border-b border-hairline text-left text-muted">
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.providers.colName') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.clients.colLocation') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.clients.colRequests') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.clients.colPaidMissions') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.clients.colDisputes') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.common.status') }}</th>
              <th class="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in data?.clients" :key="client.id" class="border-b border-hairline last:border-0 hover:bg-bg">
              <td class="px-4 py-2.5 font-semibold text-dark">
                {{ client.name }}
                <span v-if="client.riskFlag" class="ml-1" :title="t('admin.providers.riskFlagTitle')">⚠️</span>
              </td>
              <td class="px-4 py-2.5 text-muted">{{ client.location || '—' }}</td>
              <td class="px-4 py-2.5 text-muted">{{ client.requestsCount }}</td>
              <td class="px-4 py-2.5 text-muted">{{ client.paidMissionsCount }}</td>
              <td class="px-4 py-2.5 text-muted">{{ client.openDisputesCount }}</td>
              <td class="px-4 py-2.5">
                <AdminBadge :tone="client.status === 'active' ? 'success' : 'danger'">
                  {{ client.status === 'active' ? t('admin.providers.statusActive') : t('admin.providers.statusSuspended') }}
                </AdminBadge>
              </td>
              <td class="px-4 py-2.5 text-right">
                <NuxtLink :to="`/admin/chercheurs/${client.id}`" class="press font-semibold text-primary">{{ t('admin.common.viewDetail') }}</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminPagination v-if="data && data.total > 0" :page="page" :page-size="pageSize" :total="data.total" @update:page="(p) => (page = p)" />
    </div>
  </div>
</template>
