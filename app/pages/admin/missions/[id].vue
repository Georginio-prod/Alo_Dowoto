<script setup lang="ts">
/** Fiche détaillée d'une mission (#dashboard-admin, module 4). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface MissionDetail {
  id: string
  status: string
  amount: number
  clientId: string
  clientName: string
  providerId: string
  providerName: string
  createdAt: number
  paidAt: number | null
  deliveredAt: number | null
  releasedAt: number | null
  cancelledAt: number | null
  cancelReason: string | null
  disputedAt: number | null
  disputeReason: string | null
  disputeEvidence: string | null
  disputeResponse: string | null
  checkInAt: number | null
  checkOutAt: number | null
  messages: { id: string, senderRole: string, body: string, createdAt: number }[]
  notes: { id: string, authorLabel: string, body: string, createdAt: number }[]
}

const route = useRoute()
const id = route.params.id as string
const { t } = useI18n({ useScope: 'global' })

const { data, pending, error, refresh } = await useFetch<{ mission: MissionDetail }>(`/api/admin/missions/${id}`)
const mission = computed(() => data.value?.mission ?? null)

function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}
function formatDateTime(ts: number | null): string {
  return ts ? new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
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

const forceValidateOpen = ref(false)
async function forceValidate() {
  forceValidateOpen.value = false
  await withBusy(async () => { await $fetch(`/api/admin/missions/${id}/force-validate`, { method: 'POST' }) })
}

const cancelOpen = ref(false)
async function cancelMission(reason?: string) {
  cancelOpen.value = false
  if (!reason) return
  await withBusy(async () => { await $fetch(`/api/admin/missions/${id}/cancel`, { method: 'POST', body: { reason } }) })
}

const reassignOpen = ref(false)
const reassignProviderId = ref('')
async function reassign() {
  await withBusy(async () => {
    await $fetch(`/api/admin/missions/${id}/reassign`, { method: 'POST', body: { providerId: reassignProviderId.value } })
    reassignOpen.value = false
    reassignProviderId.value = ''
  })
}

async function nudge() {
  await withBusy(async () => { await $fetch(`/api/admin/missions/${id}/nudge`, { method: 'POST' }) })
}

const noteBody = ref('')
async function addNote() {
  await withBusy(async () => {
    await $fetch(`/api/admin/missions/${id}/note`, { method: 'POST', body: { body: noteBody.value } })
    noteBody.value = ''
  })
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/missions" class="mb-3 inline-block text-[12.5px] font-semibold text-muted hover:text-dark">← {{ t('admin.common.back') }}</NuxtLink>

    <p v-if="pending" class="text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
    <p v-else-if="error" class="text-[13px] text-error">{{ t('admin.common.error') }}</p>

    <template v-else-if="mission">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-[19px] font-extrabold text-dark">{{ t('admin.missions.detailTitle') }} {{ mission.id.slice(0, 8) }}</h1>
          <p class="text-[12.5px] text-muted">{{ mission.clientName }} → {{ mission.providerName }} · {{ money(mission.amount) }}</p>
        </div>
        <AdminBadge tone="info">{{ mission.status }}</AdminBadge>
      </div>

      <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="flex flex-col gap-4 lg:col-span-2">
          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.missions.timelineTitle') }}</h2>
            <dl class="grid grid-cols-2 gap-2 text-[12px]">
              <div><dt class="text-muted">{{ t('admin.missions.createdAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.createdAt) }}</dd></div>
              <div><dt class="text-muted">{{ t('admin.missions.paidAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.paidAt) }}</dd></div>
              <div><dt class="text-muted">{{ t('admin.missions.checkInAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.checkInAt) }}</dd></div>
              <div><dt class="text-muted">{{ t('admin.missions.checkOutAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.checkOutAt) }}</dd></div>
              <div><dt class="text-muted">{{ t('admin.missions.deliveredAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.deliveredAt) }}</dd></div>
              <div><dt class="text-muted">{{ t('admin.missions.releasedAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.releasedAt) }}</dd></div>
              <div><dt class="text-muted">{{ t('admin.missions.cancelledAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.cancelledAt) }}</dd></div>
              <div><dt class="text-muted">{{ t('admin.missions.disputedAt') }}</dt><dd class="text-dark">{{ formatDateTime(mission.disputedAt) }}</dd></div>
            </dl>
            <p v-if="mission.cancelReason" class="mt-2 text-[12px] text-muted">{{ t('admin.missions.cancelReason') }} : {{ mission.cancelReason }}</p>
            <p v-if="mission.disputeReason" class="mt-2 text-[12px] text-muted">{{ t('admin.missions.disputeReason') }} : {{ mission.disputeReason }}</p>
          </section>

          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.missions.conversationTitle') }}</h2>
            <p v-if="mission.messages.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
              <li v-for="msg in mission.messages" :key="msg.id" class="rounded-field border border-hairline p-2.5 text-[12px]">
                <p class="mb-0.5 font-semibold text-muted">{{ msg.senderRole }} · {{ formatDateTime(msg.createdAt) }}</p>
                <p class="text-dark">{{ msg.body }}</p>
              </li>
            </ul>
          </section>

          <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
            <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.missions.notesTitle') }}</h2>
            <div class="mb-3 flex gap-2">
              <input v-model="noteBody" type="text" :placeholder="t('admin.missions.notePlaceholder')" class="h-9 flex-1 rounded-field border border-hairline bg-white px-3 text-[12.5px] text-dark">
              <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy || !noteBody" @click="addNote">
                {{ t('admin.common.save') }}
              </button>
            </div>
            <p v-if="mission.notes.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
            <ul v-else class="flex flex-col divide-y divide-hairline">
              <li v-for="note in mission.notes" :key="note.id" class="py-2 text-[12px]">
                <p class="font-semibold text-dark">{{ note.authorLabel }} · {{ formatDateTime(note.createdAt) }}</p>
                <p class="text-muted">{{ note.body }}</p>
              </li>
            </ul>
          </section>
        </div>

        <div class="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
          <h2 class="mb-1 text-[13.5px] font-bold text-dark">{{ t('admin.common.actions') }}</h2>
          <button type="button" class="press rounded-field bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy" @click="forceValidateOpen = true">
            {{ t('admin.missions.forceValidateCta') }}
          </button>
          <button type="button" class="press rounded-field border border-error px-3.5 py-2 text-[12.5px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="cancelOpen = true">
            {{ t('admin.missions.cancelCta') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="reassignOpen = true">
            {{ t('admin.missions.reassignCta') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="nudge">
            {{ t('admin.missions.nudgeCta') }}
          </button>
        </div>
      </div>
    </template>

    <AdminConfirmModal :open="forceValidateOpen" :title="t('admin.missions.forceValidateCta')" :loading="busy" @confirm="forceValidate" @cancel="forceValidateOpen = false" />
    <AdminConfirmModal :open="cancelOpen" :title="t('admin.missions.cancelCta')" require-reason danger :loading="busy" @confirm="cancelMission" @cancel="cancelOpen = false" />

    <div v-if="reassignOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" @click.self="reassignOpen = false">
      <div class="w-full max-w-[380px] rounded-card border border-hairline bg-surface p-5 shadow-card-lg">
        <p class="mb-3 text-[15px] font-bold text-dark">{{ t('admin.missions.reassignCta') }}</p>
        <input v-model="reassignProviderId" type="text" :placeholder="t('admin.missions.reassignPlaceholder')" class="mb-3 w-full rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark">
        <div class="flex justify-end gap-2">
          <button type="button" class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted" @click="reassignOpen = false">{{ t('admin.confirmModal.cancel') }}</button>
          <button type="button" class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60" :disabled="busy || !reassignProviderId" @click="reassign">
            {{ t('admin.confirmModal.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
