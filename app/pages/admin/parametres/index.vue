<script setup lang="ts">
/** Paramètres & administration (#dashboard-admin, module 12). */
definePageMeta({ layout: 'admin', middleware: 'auth', authRole: 'admin' })

interface TeamMember { id: string, contact: string, firstName: string, lastName: string, username: string, adminLevel?: string }
interface AuditEntry { id: string, actorLabel: string, action: string, targetType: string, targetId: string | null, createdAt: number }
interface Settings { geoRadiusKm: number, autoValidationDelayHours: number, retractationDelayHours: number, currency: string, language: string }

const { t } = useI18n({ useScope: 'global' })

const { data: teamData, refresh: refreshTeam } = await useFetch<{ team: TeamMember[] }>('/api/admin/team')
const auditPage = ref(1)
const { data: auditData, refresh: refreshAudit } = await useFetch<{ entries: AuditEntry[], total: number }>('/api/admin/audit-log', { query: { page: auditPage, pageSize: 20 } })
const { data: settingsData, refresh: refreshSettings } = await useFetch<{ settings: Settings }>('/api/admin/settings')

const busy = ref(false)
const toast = ref('')
async function withBusy(action: () => Promise<void>) {
  busy.value = true
  try { await action() } catch (err) { toast.value = err instanceof Error ? err.message : t('admin.common.error') } finally { busy.value = false }
}

async function changeLevel(member: TeamMember, level: string) {
  await withBusy(async () => { await $fetch(`/api/admin/team/${member.id}/level`, { method: 'POST', body: { level } }); await refreshTeam() })
}

const promoteUserId = ref('')
const promoteLevel = ref('support')
async function promote() {
  await withBusy(async () => {
    await $fetch('/api/admin/team/promote', { method: 'POST', body: { userId: promoteUserId.value, level: promoteLevel.value } })
    promoteUserId.value = ''
    await refreshTeam()
  })
}

const geoRadiusKm = ref(15)
const autoValidationDelayHours = ref(72)
const retractationDelayHours = ref(24)
const currency = ref('XOF')
const language = ref('fr')
watchEffect(() => {
  if (settingsData.value?.settings) {
    geoRadiusKm.value = settingsData.value.settings.geoRadiusKm
    autoValidationDelayHours.value = settingsData.value.settings.autoValidationDelayHours
    retractationDelayHours.value = settingsData.value.settings.retractationDelayHours
    currency.value = settingsData.value.settings.currency
    language.value = settingsData.value.settings.language
  }
})
async function saveSettings() {
  await withBusy(async () => {
    await $fetch('/api/admin/settings', { method: 'PATCH', body: { geoRadiusKm: geoRadiusKm.value, autoValidationDelayHours: autoValidationDelayHours.value, retractationDelayHours: retractationDelayHours.value, currency: currency.value, language: language.value } })
    await refreshSettings()
  })
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.settings.title') }}</h1>
    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.settings.teamTitle') }}</h2>
      <ul v-if="teamData?.team.length" class="mb-4 flex flex-col gap-1.5">
        <li v-for="member in teamData.team" :key="member.id" class="flex flex-wrap items-center justify-between gap-2 rounded-field border border-hairline p-2.5 text-[12.5px]">
          <span class="text-dark">{{ [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username }} <span class="text-muted">({{ member.contact }})</span></span>
          <select :value="member.adminLevel ?? 'support'" class="h-8 rounded-field border border-hairline bg-white px-2 text-[12px] text-dark" @change="changeLevel(member, ($event.target as HTMLSelectElement).value)">
            <option value="admin">{{ t('admin.settings.levelAdmin') }}</option>
            <option value="moderateur">{{ t('admin.settings.levelModerator') }}</option>
            <option value="support">{{ t('admin.settings.levelSupport') }}</option>
          </select>
        </li>
      </ul>
      <p v-else class="mb-4 text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>

      <div class="flex flex-wrap items-end gap-2">
        <input v-model="promoteUserId" type="text" :placeholder="t('admin.settings.promoteIdPlaceholder')" class="h-9 min-w-[220px] flex-1 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <select v-model="promoteLevel" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
          <option value="admin">{{ t('admin.settings.levelAdmin') }}</option>
          <option value="moderateur">{{ t('admin.settings.levelModerator') }}</option>
          <option value="support">{{ t('admin.settings.levelSupport') }}</option>
        </select>
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy || !promoteUserId" @click="promote">
          {{ t('admin.settings.promoteCta') }}
        </button>
      </div>
    </section>

    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.settings.generalTitle') }}</h2>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.settings.geoRadius') }}</label>
          <input v-model.number="geoRadiusKm" type="number" min="1" class="h-9 w-[90px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        </div>
        <div>
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.settings.autoValidationDelay') }}</label>
          <input v-model.number="autoValidationDelayHours" type="number" min="1" class="h-9 w-[90px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        </div>
        <div>
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.settings.retractationDelay') }}</label>
          <input v-model.number="retractationDelayHours" type="number" min="1" class="h-9 w-[90px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        </div>
        <div>
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.settings.currency') }}</label>
          <input v-model="currency" type="text" class="h-9 w-[80px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        </div>
        <div>
          <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.settings.language') }}</label>
          <input v-model="language" type="text" class="h-9 w-[70px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        </div>
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy" @click="saveSettings">
          {{ t('admin.common.save') }}
        </button>
      </div>
    </section>

    <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.settings.auditLogTitle') }}</h2>
      <p v-if="auditData?.entries.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
      <template v-else>
        <ul class="mb-3 flex flex-col divide-y divide-hairline">
          <li v-for="entry in auditData?.entries" :key="entry.id" class="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px]">
            <span class="text-dark">{{ entry.actorLabel }} — {{ entry.action }}</span>
            <span class="text-muted">{{ entry.targetType }}{{ entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : '' }}</span>
            <span class="text-muted">{{ formatDateTime(entry.createdAt) }}</span>
          </li>
        </ul>
        <AdminPagination v-if="auditData" :page="auditPage" :page-size="20" :total="auditData.total" @update:page="(p) => { auditPage = p; refreshAudit() }" />
      </template>
    </section>
  </div>
</template>
