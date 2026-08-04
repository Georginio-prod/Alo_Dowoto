<script setup lang="ts">
/** Litiges & médiation (#dashboard-admin, module 6). */
definePageMeta({ layout: 'admin', middleware: 'auth', authRole: 'admin' })

interface Dispute { id: string, clientId: string, providerId: string, amount: number, disputedAt: number | null, disputeReason: string | null, disputeResponse: string | null }

const { t } = useI18n({ useScope: 'global' })
const { data, pending, error, refresh } = await useFetch<{ disputes: Dispute[] }>('/api/admin/disputes')

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}
function ageInDays(ts: number | null): number {
  if (!ts) return 0
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000))
}
function urgencyTone(days: number): 'neutral' | 'warning' | 'danger' {
  if (days >= 3) return 'danger'
  if (days >= 1) return 'warning'
  return 'neutral'
}

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

const resolveTarget = ref<Dispute | null>(null)
const resolveOutcome = ref<'client' | 'provider' | 'split'>('provider')
const splitPercent = ref(50)
const resolveNote = ref('')

async function submitResolve() {
  const target = resolveTarget.value
  if (!target) return
  await withBusy(async () => {
    await $fetch(`/api/admin/disputes/${target.id}/resolve`, {
      method: 'POST',
      body: { outcome: resolveOutcome.value, providerSharePercent: resolveOutcome.value === 'split' ? splitPercent.value : undefined, note: resolveNote.value || undefined },
    })
    resolveTarget.value = null
    resolveNote.value = ''
  })
}

async function requestEvidence(dispute: Dispute) {
  await withBusy(async () => { await $fetch(`/api/admin/disputes/${dispute.id}/request-evidence`, { method: 'POST' }) })
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.disputes.title') }}</h1>

    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>
    <p v-if="pending" class="text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
    <p v-else-if="error" class="text-[13px] text-error">{{ t('admin.common.error') }}</p>
    <p v-else-if="data?.disputes.length === 0" class="rounded-card border border-hairline bg-surface p-6 text-center text-[13px] text-muted shadow-card-sm">{{ t('admin.common.empty') }}</p>

    <ul v-else class="flex flex-col gap-3">
      <li v-for="dispute in data?.disputes" :key="dispute.id" class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <NuxtLink :to="`/admin/missions/${dispute.id}`" class="font-semibold text-primary">{{ dispute.id.slice(0, 8) }}</NuxtLink>
          <div class="flex items-center gap-2">
            <AdminBadge :tone="urgencyTone(ageInDays(dispute.disputedAt))">{{ t('admin.disputes.ageDays', { days: ageInDays(dispute.disputedAt) }) }}</AdminBadge>
            <span class="text-[13px] font-semibold text-dark">{{ money(dispute.amount) }}</span>
          </div>
        </div>
        <p class="mb-1 text-[12.5px] text-muted"><strong class="text-dark">{{ t('admin.disputes.clientVersion') }}:</strong> {{ dispute.disputeReason ?? '—' }}</p>
        <p class="mb-3 text-[12.5px] text-muted"><strong class="text-dark">{{ t('admin.disputes.providerVersion') }}:</strong> {{ dispute.disputeResponse ?? t('admin.disputes.noResponseYet') }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="press rounded-field border border-hairline bg-white px-3 py-1.5 text-[12px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="resolveTarget = dispute; resolveOutcome = 'client'">
            {{ t('admin.disputes.favorClient') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3 py-1.5 text-[12px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="resolveTarget = dispute; resolveOutcome = 'provider'">
            {{ t('admin.disputes.favorProvider') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3 py-1.5 text-[12px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="resolveTarget = dispute; resolveOutcome = 'split'">
            {{ t('admin.disputes.split') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3 py-1.5 text-[12px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="requestEvidence(dispute)">
            {{ t('admin.disputes.requestEvidence') }}
          </button>
        </div>
      </li>
    </ul>

    <div v-if="resolveTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" @click.self="resolveTarget = null">
      <div class="w-full max-w-[400px] rounded-card border border-hairline bg-surface p-5 shadow-card-lg">
        <p class="mb-3 text-[15px] font-bold text-dark">
          {{ resolveOutcome === 'client' ? t('admin.disputes.favorClient') : resolveOutcome === 'provider' ? t('admin.disputes.favorProvider') : t('admin.disputes.split') }}
        </p>
        <div v-if="resolveOutcome === 'split'" class="mb-3">
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.disputes.splitPercentLabel') }}</label>
          <input v-model.number="splitPercent" type="number" min="0" max="100" class="w-full rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark">
        </div>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.disputes.reasonLabel') }}</label>
        <textarea v-model="resolveNote" rows="3" class="mb-3 w-full resize-none rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark" />
        <div class="flex justify-end gap-2">
          <button type="button" class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted" @click="resolveTarget = null">{{ t('admin.confirmModal.cancel') }}</button>
          <button type="button" class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60" :disabled="busy" @click="submitResolve">
            {{ t('admin.confirmModal.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
