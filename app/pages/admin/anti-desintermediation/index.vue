<script setup lang="ts">
/** Anti-désintermédiation (#dashboard-admin, module 9). */
definePageMeta({ layout: 'admin', middleware: 'auth', authRole: 'admin' })

interface Signal { userId: string, userName: string, attemptCount: number, lastAttemptAt: number, reasons: string[] }
interface MissionDrop { providerId: string, providerName: string, recentCount: number, previousCount: number, dropPercent: number }
interface RiskScore { userId: string, userName: string, score: number, attemptCount: number, falsePositive: boolean }
interface BrowseSignal { clientId: string, clientName: string, viewsCount: number, paidAdvancesCount: number }

const { t } = useI18n({ useScope: 'global' })
const { data, pending, error, refresh } = await useFetch<{ signals: Signal[], missionDrops: MissionDrop[], riskScores: RiskScore[], browseWithoutPaySignals: BrowseSignal[] }>('/api/admin/anti-circumvention')

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const busy = ref(false)
const toast = ref('')
async function withBusy(action: () => Promise<void>) {
  busy.value = true
  try { await action(); await refresh() } catch (err) { toast.value = err instanceof Error ? err.message : t('admin.common.error') } finally { busy.value = false }
}

async function warn(userId: string) {
  await withBusy(async () => { await $fetch(`/api/admin/anti-circumvention/${userId}/warn`, { method: 'POST' }) })
}
async function restrict(userId: string) {
  await withBusy(async () => { await $fetch(`/api/admin/anti-circumvention/${userId}/restrict-messaging`, { method: 'POST', body: { restricted: true } }) })
}
const suspendTarget = ref<string | null>(null)
async function suspend(reason?: string) {
  const userId = suspendTarget.value
  suspendTarget.value = null
  if (!userId || !reason) return
  await withBusy(async () => { await $fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST', body: { reason } }) })
}
async function markFalsePositive(userId: string) {
  await withBusy(async () => { await $fetch(`/api/admin/anti-circumvention/${userId}/false-positive`, { method: 'POST', body: {} }) })
}

function riskTone(score: number): 'neutral' | 'warning' | 'danger' {
  if (score >= 60) return 'danger'
  if (score >= 20) return 'warning'
  return 'neutral'
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.antiCircumvention.title') }}</h1>
    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>
    <p v-if="pending" class="text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
    <p v-else-if="error" class="text-[13px] text-error">{{ t('admin.common.error') }}</p>

    <template v-else-if="data">
      <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
        <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.antiCircumvention.riskScoreTitle') }}</h2>
        <p v-if="data.riskScores.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
        <ul v-else class="flex flex-col gap-2">
          <li v-for="entry in data.riskScores" :key="entry.userId" class="flex flex-wrap items-center justify-between gap-2 rounded-field border border-hairline p-2.5">
            <div class="min-w-0">
              <p class="font-semibold text-dark">{{ entry.userName }}</p>
              <p class="text-[11.5px] text-muted">{{ t('admin.antiCircumvention.attemptCount', { count: entry.attemptCount }) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <AdminBadge :tone="entry.falsePositive ? 'neutral' : riskTone(entry.score)">{{ entry.falsePositive ? t('admin.antiCircumvention.falsePositiveBadge') : `${entry.score}/100` }}</AdminBadge>
              <button type="button" class="press rounded-field border border-hairline bg-white px-2.5 py-1 text-[11px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="warn(entry.userId)">{{ t('admin.antiCircumvention.warnCta') }}</button>
              <button type="button" class="press rounded-field border border-hairline bg-white px-2.5 py-1 text-[11px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="restrict(entry.userId)">{{ t('admin.antiCircumvention.restrictCta') }}</button>
              <button type="button" class="press rounded-field border border-error px-2.5 py-1 text-[11px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="suspendTarget = entry.userId">{{ t('admin.providers.suspendCta') }}</button>
              <button v-if="!entry.falsePositive" type="button" class="press rounded-field border border-hairline bg-white px-2.5 py-1 text-[11px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="markFalsePositive(entry.userId)">{{ t('admin.antiCircumvention.falsePositiveCta') }}</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
        <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.antiCircumvention.signalsTitle') }}</h2>
        <p v-if="data.signals.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
        <table v-else class="w-full min-w-[500px] border-collapse text-[12.5px]">
          <thead>
            <tr class="border-b border-hairline text-left text-muted">
              <th class="py-2 font-semibold">{{ t('admin.providers.colName') }}</th>
              <th class="py-2 font-semibold">{{ t('admin.antiCircumvention.colCount') }}</th>
              <th class="py-2 font-semibold">{{ t('admin.antiCircumvention.colLast') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="signal in data.signals" :key="signal.userId" class="border-b border-hairline last:border-0">
              <td class="py-2 text-dark">{{ signal.userName }}</td>
              <td class="py-2 text-muted">{{ signal.attemptCount }} ({{ signal.reasons.join(', ') }})</td>
              <td class="py-2 text-muted">{{ formatDate(signal.lastAttemptAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
        <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.antiCircumvention.missionDropTitle') }}</h2>
        <p v-if="data.missionDrops.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
        <ul v-else class="flex flex-col gap-1.5">
          <li v-for="drop in data.missionDrops" :key="drop.providerId" class="flex justify-between text-[12.5px]">
            <span class="text-dark">{{ drop.providerName }}</span>
            <span class="text-muted">{{ drop.previousCount }} → {{ drop.recentCount }} ({{ t('admin.antiCircumvention.dropPercent', { percent: drop.dropPercent }) }})</span>
          </li>
        </ul>
      </section>

      <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm opacity-80">
        <h2 class="mb-1 text-[13.5px] font-bold text-dark">{{ t('admin.antiCircumvention.browseTitle') }}</h2>
        <p class="mb-3 text-[11.5px] italic text-muted">{{ t('admin.antiCircumvention.browseDemoNote') }}</p>
        <ul class="flex flex-col gap-1.5">
          <li v-for="signal in data.browseWithoutPaySignals" :key="signal.clientId" class="flex justify-between text-[12.5px]">
            <span class="text-dark">{{ signal.clientName }}</span>
            <span class="text-muted">{{ t('admin.antiCircumvention.viewsNoPayment', { views: signal.viewsCount }) }}</span>
          </li>
        </ul>
      </section>
    </template>

    <AdminConfirmModal :open="suspendTarget !== null" :title="t('admin.providers.suspendCta')" require-reason danger :loading="busy" @confirm="suspend" @cancel="suspendTarget = null" />
  </div>
</template>
