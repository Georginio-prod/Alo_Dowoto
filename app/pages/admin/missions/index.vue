<script setup lang="ts">
/** Liste des missions et fiches préalables (#dashboard-admin, module 4). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface MissionSummary { id: string, status: string, amount: number, clientName: string, providerName: string, createdAt: number }
interface DraftRequest { id: string, title: string, userId: string, createdAt: number }

const { t } = useI18n({ useScope: 'global' })

const page = ref(1)
const pageSize = 20
const statusFilter = ref('')

const query = computed(() => ({ page: page.value, pageSize, ...(statusFilter.value ? { status: statusFilter.value } : {}) }))
const { data, pending, error } = await useFetch<{ missions: MissionSummary[], total: number, drafts: DraftRequest[] }>('/api/admin/missions', { query })
watch(statusFilter, () => { page.value = 1 })

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  awaiting_payment: 'neutral',
  in_escrow: 'info',
  delivered: 'warning',
  released: 'success',
  refunded: 'neutral',
  disputed: 'danger',
}

const STATUS_LABEL = computed<Record<string, string>>(() => ({
  awaiting_payment: t('admin.missions.statusAwaitingPayment'),
  in_escrow: t('admin.missions.statusInEscrow'),
  delivered: t('admin.missions.statusDelivered'),
  released: t('admin.missions.statusReleased'),
  refunded: t('admin.missions.statusRefunded'),
  disputed: t('admin.missions.statusDisputed'),
}))

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.missions.title') }}</h1>

    <div class="mb-4 flex flex-wrap gap-2">
      <select v-model="statusFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.providers.filterStatus') }}</option>
        <option value="awaiting_payment">{{ t('admin.missions.statusAwaitingPayment') }}</option>
        <option value="in_escrow">{{ t('admin.missions.statusInEscrow') }}</option>
        <option value="delivered">{{ t('admin.missions.statusDelivered') }}</option>
        <option value="released">{{ t('admin.missions.statusReleased') }}</option>
        <option value="refunded">{{ t('admin.missions.statusRefunded') }}</option>
        <option value="disputed">{{ t('admin.missions.statusDisputed') }}</option>
      </select>
    </div>

    <div class="overflow-hidden rounded-card border border-hairline bg-surface shadow-card-sm">
      <p v-if="pending" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
      <p v-else-if="error" class="p-5 text-center text-[13px] text-error">{{ t('admin.common.error') }}</p>
      <p v-else-if="data?.missions.length === 0" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.empty') }}</p>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr class="border-b border-hairline text-left text-muted">
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.missions.colClient') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.missions.colProvider') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.missions.colAmount') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.common.status') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.missions.colDate') }}</th>
              <th class="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="mission in data?.missions" :key="mission.id" class="border-b border-hairline last:border-0 hover:bg-bg">
              <td class="px-4 py-2.5 text-dark">{{ mission.clientName }}</td>
              <td class="px-4 py-2.5 text-dark">{{ mission.providerName }}</td>
              <td class="px-4 py-2.5 font-semibold text-dark">{{ money(mission.amount) }}</td>
              <td class="px-4 py-2.5"><AdminBadge :tone="STATUS_TONE[mission.status]">{{ STATUS_LABEL[mission.status] }}</AdminBadge></td>
              <td class="px-4 py-2.5 text-muted">{{ formatDate(mission.createdAt) }}</td>
              <td class="px-4 py-2.5 text-right">
                <NuxtLink :to="`/admin/missions/${mission.id}`" class="press font-semibold text-primary">{{ t('admin.common.viewDetail') }}</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminPagination v-if="data && data.total > 0" :page="page" :page-size="pageSize" :total="data.total" @update:page="(p) => (page = p)" />
    </div>

    <section v-if="data?.drafts.length" class="mt-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.missions.draftsTitle') }}</h2>
      <p class="mb-3 text-[11.5px] text-muted">{{ t('admin.missions.draftsHint') }}</p>
      <ul class="flex flex-col divide-y divide-hairline">
        <li v-for="draft in data.drafts" :key="draft.id" class="flex justify-between py-2 text-[12.5px]">
          <span class="text-dark">{{ draft.title }}</span>
          <span class="text-muted">{{ formatDate(draft.createdAt) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
