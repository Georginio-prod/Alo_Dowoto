<script setup lang="ts">
/** Paiements & séquestre (#dashboard-admin, module 5). */
definePageMeta({ layout: 'admin', middleware: 'auth', authRole: 'admin' })

interface MovementRow { id: string, kind: string, amount: number, status: string, method: string | null, userId: string, createdAt: number }
interface BlockedAlert { orderId: string, amount: number, status: string, since: number }

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

const page = ref(1)
const pageSize = 25
const kindFilter = ref('')
const statusFilter = ref('')
const methodFilter = ref('')

onMounted(() => { if (route.query.blocked === '1') kindFilter.value = '' })

const query = computed(() => ({
  page: page.value,
  pageSize,
  ...(kindFilter.value ? { kind: kindFilter.value } : {}),
  ...(statusFilter.value ? { status: statusFilter.value } : {}),
  ...(methodFilter.value ? { method: methodFilter.value } : {}),
}))

const { data, pending, error, refresh } = await useFetch<{ rows: MovementRow[], total: number, blocked: BlockedAlert[] }>('/api/admin/payments', { query })
watch([kindFilter, statusFilter, methodFilter], () => { page.value = 1 })

const KIND_LABEL = computed<Record<string, string>>(() => ({
  subscription_payment: t('admin.payments.kindSubscription'),
  wallet_recharge: t('admin.payments.kindRecharge'),
  escrow_debit: t('admin.payments.kindEscrowDebit'),
  escrow_release: t('admin.payments.kindEscrowRelease'),
  escrow_refund: t('admin.payments.kindEscrowRefund'),
  commission: t('admin.payments.kindCommission'),
  other: '—',
}))

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

async function releaseOrder(orderId: string) {
  await withBusy(async () => { await $fetch(`/api/admin/payments/${orderId}/release`, { method: 'POST' }) })
}

const refundTarget = ref<string | null>(null)
async function refundOrder(reason?: string) {
  const orderId = refundTarget.value
  refundTarget.value = null
  if (!orderId || !reason) return
  await withBusy(async () => { await $fetch(`/api/admin/payments/${orderId}/refund`, { method: 'POST', body: { reason } }) })
}

async function retryTransaction(row: MovementRow) {
  if (row.kind !== 'subscription_payment' && row.kind !== 'wallet_recharge') return
  await withBusy(async () => { await $fetch(`/api/admin/payments/${row.id}/retry`, { method: 'POST', body: { kind: row.kind } }) })
}

function exportCsv() {
  const params = new URLSearchParams(query.value as unknown as Record<string, string>)
  window.open(`/api/admin/payments/export?${params.toString()}`, '_blank')
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.payments.title') }}</h1>

    <section v-if="data?.blocked.length" class="mb-4 rounded-card border border-error/30 bg-error/5 p-4">
      <p class="mb-2 text-[13px] font-bold text-error">{{ t('admin.payments.blockedAlert', { count: data.blocked.length }) }}</p>
      <ul class="flex flex-col gap-1.5">
        <li v-for="alert in data.blocked" :key="alert.orderId" class="flex items-center justify-between text-[12.5px]">
          <NuxtLink :to="`/admin/missions/${alert.orderId}`" class="font-semibold text-primary">{{ alert.orderId.slice(0, 8) }}</NuxtLink>
          <span class="text-muted">{{ money(alert.amount) }} · {{ formatDate(alert.since) }}</span>
          <button type="button" class="press rounded-field border border-hairline bg-white px-2.5 py-1 text-[11.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="releaseOrder(alert.orderId)">
            {{ t('admin.payments.releaseCta') }}
          </button>
        </li>
      </ul>
    </section>

    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <select v-model="kindFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.payments.filterKind') }}</option>
        <option value="subscription_payment">{{ t('admin.payments.kindSubscription') }}</option>
        <option value="wallet_recharge">{{ t('admin.payments.kindRecharge') }}</option>
        <option value="escrow_debit">{{ t('admin.payments.kindEscrowDebit') }}</option>
        <option value="escrow_release">{{ t('admin.payments.kindEscrowRelease') }}</option>
        <option value="escrow_refund">{{ t('admin.payments.kindEscrowRefund') }}</option>
        <option value="commission">{{ t('admin.payments.kindCommission') }}</option>
      </select>
      <select v-model="statusFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.providers.filterStatus') }}</option>
        <option value="pending">{{ t('admin.payments.statusPending') }}</option>
        <option value="confirmed">{{ t('admin.payments.statusConfirmed') }}</option>
        <option value="failed">{{ t('admin.payments.statusFailed') }}</option>
      </select>
      <select v-model="methodFilter" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <option value="">{{ t('admin.payments.filterMethod') }}</option>
        <option value="flooz">Flooz</option>
        <option value="tmoney">T-Money</option>
      </select>
      <button type="button" class="press ml-auto h-9 rounded-field border border-hairline bg-white px-3.5 text-[12.5px] font-semibold text-dark" @click="exportCsv">
        {{ t('admin.payments.exportCta') }}
      </button>
    </div>

    <div class="overflow-hidden rounded-card border border-hairline bg-surface shadow-card-sm">
      <p v-if="pending" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
      <p v-else-if="error" class="p-5 text-center text-[13px] text-error">{{ t('admin.common.error') }}</p>
      <p v-else-if="data?.rows.length === 0" class="p-5 text-center text-[13px] text-muted">{{ t('admin.common.empty') }}</p>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr class="border-b border-hairline text-left text-muted">
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.payments.colKind') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.missions.colAmount') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.common.status') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.payments.colMethod') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('admin.missions.colDate') }}</th>
              <th class="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data?.rows" :key="`${row.kind}-${row.id}`" class="border-b border-hairline last:border-0 hover:bg-bg">
              <td class="px-4 py-2.5 text-dark">{{ KIND_LABEL[row.kind] }}</td>
              <td class="px-4 py-2.5 font-semibold text-dark">{{ money(row.amount) }}</td>
              <td class="px-4 py-2.5">
                <AdminBadge :tone="row.status === 'confirmed' || row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'">{{ row.status }}</AdminBadge>
              </td>
              <td class="px-4 py-2.5 text-muted">{{ row.method ?? '—' }}</td>
              <td class="px-4 py-2.5 text-muted">{{ formatDate(row.createdAt) }}</td>
              <td class="px-4 py-2.5 text-right">
                <button
                  v-if="row.status === 'failed'"
                  type="button"
                  class="press font-semibold text-primary disabled:opacity-60"
                  :disabled="busy"
                  @click="retryTransaction(row)"
                >
                  {{ t('admin.payments.retryCta') }}
                </button>
                <button
                  v-else-if="row.kind === 'escrow_debit'"
                  type="button"
                  class="press font-semibold text-error disabled:opacity-60"
                  :disabled="busy"
                  @click="refundTarget = row.id"
                >
                  {{ t('admin.payments.refundCta') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminPagination v-if="data && data.total > 0" :page="page" :page-size="pageSize" :total="data.total" @update:page="(p) => (page = p)" />
    </div>

    <AdminConfirmModal
      :open="refundTarget !== null"
      :title="t('admin.payments.refundCta')"
      require-reason
      danger
      :loading="busy"
      @confirm="refundOrder"
      @cancel="refundTarget = null"
    />
  </div>
</template>
