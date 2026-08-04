<script setup lang="ts">
/** Fiche détaillée d'un chercheur (#dashboard-admin, module 3). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface ClientDetail {
  user: { id: string, contact: string, firstName: string, lastName: string, username: string, location: string, status: 'active' | 'suspended', riskFlag: boolean, riskNote?: string, createdAt: number }
  requests: { id: string, title: string, createdAt: number }[]
  missions: { id: string, status: string, amount: number, createdAt: number, providerId: string }[]
  disputes: { id: string, disputeReason: string | null, disputedAt: number | null }[]
  refunds: { id: string, amount: number, createdAt: number }[]
  reviewsLeft: { id: string, rating: number, comment: string | null, createdAt: number, targetId: string }[]
}

const route = useRoute()
const id = route.params.id as string
const { t } = useI18n({ useScope: 'global' })

const { data, pending, error, refresh } = await useFetch<{ client: ClientDetail }>(`/api/admin/clients/${id}`)
const client = computed(() => data.value?.client ?? null)

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}
function formatDate(ts: number | null): string {
  return ts ? new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
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

const suspendOpen = ref(false)
async function suspend(reason?: string) {
  suspendOpen.value = false
  if (!reason) return
  await withBusy(async () => { await $fetch(`/api/admin/users/${id}/suspend`, { method: 'POST', body: { reason } }) })
}
async function reactivate() {
  await withBusy(async () => { await $fetch(`/api/admin/users/${id}/reactivate`, { method: 'POST' }) })
}

const riskBusy = ref(false)
async function toggleRisk() {
  riskBusy.value = true
  try {
    await $fetch(`/api/admin/users/${id}/risk-flag`, { method: 'POST', body: { riskFlag: !client.value?.user.riskFlag } })
    await refresh()
  } finally {
    riskBusy.value = false
  }
}

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

const refundOpen = ref(false)
const refundAmount = ref(1000)
const refundReason = ref('')
async function submitRefund() {
  await withBusy(async () => {
    await $fetch(`/api/admin/clients/${id}/refund`, { method: 'POST', body: { amount: refundAmount.value, reason: refundReason.value } })
    refundOpen.value = false
    refundReason.value = ''
  })
}

const deleteOpen = ref(false)
async function deleteAccount() {
  deleteOpen.value = false
  await withBusy(async () => { await $fetch(`/api/admin/users/${id}/delete`, { method: 'POST', body: {} }) })
  navigateTo('/admin/chercheurs')
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/chercheurs" class="mb-3 inline-block text-[12.5px] font-semibold text-muted hover:text-dark">← {{ t('admin.common.back') }}</NuxtLink>

    <p v-if="pending" class="text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
    <p v-else-if="error" class="text-[13px] text-error">{{ t('admin.common.error') }}</p>

    <template v-else-if="client">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-[19px] font-extrabold text-dark">{{ [client.user.firstName, client.user.lastName].filter(Boolean).join(' ') || client.user.username }}</h1>
          <p class="text-[12.5px] text-muted">{{ client.user.contact }} · {{ client.user.location }} · {{ t('admin.providers.memberSince') }} {{ formatDate(client.user.createdAt) }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AdminBadge :tone="client.user.status === 'active' ? 'success' : 'danger'">{{ client.user.status === 'active' ? t('admin.providers.statusActive') : t('admin.providers.statusSuspended') }}</AdminBadge>
          <AdminBadge v-if="client.user.riskFlag" tone="warning">{{ t('admin.providers.riskFlagTitle') }}</AdminBadge>
        </div>
      </div>

      <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="flex flex-col gap-4 lg:col-span-2">
          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.clients.requestsTitle') }}</h2>
            <p v-if="client.requests.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="r in client.requests" :key="r.id" class="flex justify-between py-2 text-[12.5px]">
                <span class="text-dark">{{ r.title }}</span>
                <span class="text-muted">{{ formatDate(r.createdAt) }}</span>
              </li>
            </ul>
          </section>

          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.clients.missionsTitle') }}</h2>
            <p v-if="client.missions.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="m in client.missions" :key="m.id" class="flex items-center justify-between py-2 text-[12.5px]">
                <NuxtLink :to="`/admin/missions/${m.id}`" class="font-semibold text-primary">{{ m.id.slice(0, 8) }}</NuxtLink>
                <span class="text-muted">{{ m.status }}</span>
                <span class="text-dark">{{ money(m.amount) }}</span>
              </li>
            </ul>
          </section>

          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.clients.disputesTitle') }}</h2>
            <p v-if="client.disputes.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="d in client.disputes" :key="d.id" class="py-2 text-[12.5px]">
                <NuxtLink :to="`/admin/missions/${d.id}`" class="font-semibold text-primary">{{ d.id.slice(0, 8) }}</NuxtLink>
                <span class="ml-2 text-muted">{{ d.disputeReason }}</span>
              </li>
            </ul>
          </section>

          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.clients.refundsTitle') }}</h2>
            <p v-if="client.refunds.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="r in client.refunds" :key="r.id" class="flex justify-between py-2 text-[12.5px]">
                <span class="text-dark">{{ money(r.amount) }}</span>
                <span class="text-muted">{{ formatDate(r.createdAt) }}</span>
              </li>
            </ul>
          </section>

          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.clients.reviewsLeftTitle') }}</h2>
            <p v-if="client.reviewsLeft.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="r in client.reviewsLeft" :key="r.id" class="py-2 text-[12.5px]">
                <span class="font-semibold text-dark">{{ '★'.repeat(r.rating) }}</span>
                <span v-if="r.comment" class="ml-2 text-muted">{{ r.comment }}</span>
              </li>
            </ul>
          </section>
        </div>

        <div class="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
          <h2 class="mb-1 text-[13.5px] font-bold text-dark">{{ t('admin.common.actions') }}</h2>
          <button v-if="client.user.status === 'active'" type="button" class="press rounded-field border border-error px-3.5 py-2 text-[12.5px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="suspendOpen = true">
            {{ t('admin.providers.suspendCta') }}
          </button>
          <button v-else type="button" class="press rounded-field bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy" @click="reactivate">
            {{ t('admin.providers.reactivateCta') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="riskBusy" @click="toggleRisk">
            {{ client.user.riskFlag ? t('admin.clients.clearRiskCta') : t('admin.clients.markRiskCta') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="refundOpen = true">
            {{ t('admin.clients.refundCta') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="messageOpen = true">
            {{ t('admin.providers.messageCta') }}
          </button>
          <button type="button" class="press rounded-field border border-error bg-error/5 px-3.5 py-2 text-[12.5px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="deleteOpen = true">
            {{ t('admin.providers.deleteCta') }}
          </button>
        </div>
      </div>
    </template>

    <AdminConfirmModal :open="suspendOpen" :title="t('admin.providers.suspendCta')" require-reason danger :loading="busy" @confirm="suspend" @cancel="suspendOpen = false" />
    <AdminConfirmModal :open="deleteOpen" :title="t('admin.providers.deleteCta')" :description="t('admin.providers.deleteWarning')" danger :loading="busy" @confirm="deleteAccount" @cancel="deleteOpen = false" />

    <div v-if="refundOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" @click.self="refundOpen = false">
      <div class="w-full max-w-[380px] rounded-card border border-hairline bg-surface p-5 shadow-card-lg">
        <p class="mb-3 text-[15px] font-bold text-dark">{{ t('admin.clients.refundCta') }}</p>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.clients.refundAmount') }}</label>
        <input v-model.number="refundAmount" type="number" min="1" class="mb-2 w-full rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark">
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.confirmModal.reasonLabel') }}</label>
        <textarea v-model="refundReason" rows="3" class="mb-3 w-full resize-none rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark" />
        <div class="flex justify-end gap-2">
          <button type="button" class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted" @click="refundOpen = false">{{ t('admin.confirmModal.cancel') }}</button>
          <button type="button" class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60" :disabled="busy || !refundReason || !refundAmount" @click="submitRefund">
            {{ t('admin.confirmModal.confirm') }}
          </button>
        </div>
      </div>
    </div>

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
