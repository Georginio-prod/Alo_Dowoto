<script setup lang="ts">
/** Vue d'ensemble du dashboard admin (#dashboard-admin, module 1). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface OverviewResponse {
  kpis: {
    monthlyRevenue: number
    missionsInProgress: number
    missionsCompleted: number
    amountInEscrow: number
    activeProviders: number
    newClientsThisMonth: number
    cancellationRatePercent: number
    averageRating: number
  }
  missions30d: { date: string, count: number }[]
  revenueBySector: { sector: string, amount: number }[]
  funnel: { searches: number, requestsSent: number, advancesPaid: number, missionsCompleted: number, missionsValidated: number, searchesEstimated: boolean }
  recentActivity: { id: string, kind: string, label: string, timestamp: number }[]
}

const { t } = useI18n({ useScope: 'global' })
const { data, pending, error, refresh } = await useFetch<OverviewResponse>('/api/admin/overview')

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}

const maxMissionCount = computed(() => Math.max(1, ...(data.value?.missions30d.map((d) => d.count) ?? [1])))
const maxSectorAmount = computed(() => Math.max(1, ...(data.value?.revenueBySector.map((d) => d.amount) ?? [1])))

const FUNNEL_STAGES = computed(() => {
  const f = data.value?.funnel
  if (!f) return []
  return [
    { label: t('admin.overview.funnelSearches'), value: f.searches, estimated: f.searchesEstimated },
    { label: t('admin.overview.funnelRequests'), value: f.requestsSent, estimated: false },
    { label: t('admin.overview.funnelPaid'), value: f.advancesPaid, estimated: false },
    { label: t('admin.overview.funnelCompleted'), value: f.missionsCompleted, estimated: false },
    { label: t('admin.overview.funnelValidated'), value: f.missionsValidated, estimated: false },
  ]
})
const maxFunnelValue = computed(() => Math.max(1, ...FUNNEL_STAGES.value.map((s) => s.value)))

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const ACTIVITY_ICON: Record<string, string> = { signup: '🆕', dispute: '⚖️', release: '💸', admin_action: '🛠️' }
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.overview.title') }}</h1>

    <p v-if="pending" class="text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
    <p v-else-if="error" class="text-[13px] text-error">{{ t('admin.common.error') }}</p>

    <template v-else-if="data">
      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <AdminStatCard :label="t('admin.overview.kpiRevenue')" :value="money(data.kpis.monthlyRevenue)" />
        <AdminStatCard :label="t('admin.overview.kpiInProgress')" :value="String(data.kpis.missionsInProgress)" />
        <AdminStatCard :label="t('admin.overview.kpiCompleted')" :value="String(data.kpis.missionsCompleted)" />
        <AdminStatCard :label="t('admin.overview.kpiEscrow')" :value="money(data.kpis.amountInEscrow)" />
        <AdminStatCard :label="t('admin.overview.kpiActiveProviders')" :value="String(data.kpis.activeProviders)" />
        <AdminStatCard :label="t('admin.overview.kpiNewClients')" :value="String(data.kpis.newClientsThisMonth)" />
        <AdminStatCard :label="t('admin.overview.kpiCancellationRate')" :value="`${data.kpis.cancellationRatePercent}%`" />
        <AdminStatCard :label="t('admin.overview.kpiRating')" :value="data.kpis.averageRating > 0 ? `${data.kpis.averageRating} / 5` : '—'" />
      </div>

      <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
          <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.overview.missionsChartTitle') }}</h2>
          <div class="flex h-[120px] items-end gap-[2px]" role="img" :aria-label="t('admin.overview.missionsChartTitle')">
            <div
              v-for="point in data.missions30d"
              :key="point.date"
              class="group relative flex-1 rounded-t-[2px] bg-primary"
              :style="{ height: `${Math.max(4, (point.count / maxMissionCount) * 100)}%` }"
            >
              <span class="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded-field bg-dark px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                {{ formatDay(point.date) }} · {{ point.count }}
              </span>
            </div>
          </div>
          <div class="mt-1.5 flex justify-between text-[10.5px] text-muted">
            <span>{{ formatDay(data.missions30d[0]?.date ?? '') }}</span>
            <span>{{ formatDay(data.missions30d.at(-1)?.date ?? '') }}</span>
          </div>
        </section>

        <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
          <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.overview.sectorChartTitle') }}</h2>
          <p v-if="data.revenueBySector.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
          <ul v-else class="flex flex-col gap-2.5">
            <li v-for="row in data.revenueBySector" :key="row.sector">
              <div class="mb-1 flex justify-between text-[12px]">
                <span class="font-semibold text-dark">{{ row.sector }}</span>
                <span class="text-muted">{{ money(row.amount) }}</span>
              </div>
              <div class="h-2 rounded-pill bg-bg">
                <div class="h-2 rounded-pill bg-primary" :style="{ width: `${Math.max(2, (row.amount / maxSectorAmount) * 100)}%` }" />
              </div>
            </li>
          </ul>
        </section>
      </div>

      <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
        <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.overview.funnelTitle') }}</h2>
        <ul class="flex flex-col gap-2.5">
          <li v-for="stage in FUNNEL_STAGES" :key="stage.label">
            <div class="mb-1 flex justify-between text-[12px]">
              <span class="font-semibold text-dark">
                {{ stage.label }}
                <span v-if="stage.estimated" class="ml-1 text-[10.5px] font-normal text-muted">({{ t('admin.overview.estimated') }})</span>
              </span>
              <span class="text-muted">{{ stage.value.toLocaleString('fr-FR') }}</span>
            </div>
            <div class="h-2 rounded-pill bg-bg">
              <div class="h-2 rounded-pill bg-primary" :style="{ width: `${Math.max(2, (stage.value / maxFunnelValue) * 100)}%` }" />
            </div>
          </li>
        </ul>
      </section>

      <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
        <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.overview.recentActivityTitle') }}</h2>
        <p v-if="data.recentActivity.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
        <ul v-else class="flex flex-col divide-y divide-hairline">
          <li v-for="entry in data.recentActivity" :key="entry.id" class="flex items-center gap-2.5 py-2 text-[12.5px]">
            <span>{{ ACTIVITY_ICON[entry.kind] ?? '•' }}</span>
            <span class="min-w-0 flex-1 truncate text-dark">{{ entry.label }}</span>
            <span class="shrink-0 text-muted">{{ formatTimestamp(entry.timestamp) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
