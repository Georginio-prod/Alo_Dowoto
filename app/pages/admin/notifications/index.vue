<script setup lang="ts">
/** Notifications & campagnes (#dashboard-admin, module 11). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface Campaign { id: string, segment: string, channel: string, subject: string | null, body: string, scheduledAt: string | null, sentAt: string | null, recipientCount: number, openCount: number, createdAt: string }
interface Template { key: string, label: string, channel: string, subject: string | null, body: string }

const { t } = useI18n({ useScope: 'global' })

const { data: campaignsData, refresh: refreshCampaigns } = await useFetch<{ campaigns: Campaign[] }>('/api/admin/campaigns')
const { data: templatesData, refresh: refreshTemplates } = await useFetch<{ templates: Template[] }>('/api/admin/templates')

const busy = ref(false)
const toast = ref('')
async function withBusy(action: () => Promise<void>) {
  busy.value = true
  try { await action() } catch (err) { toast.value = err instanceof Error ? err.message : t('admin.common.error') } finally { busy.value = false }
}

const form = ref({ role: '' as '' | 'client' | 'prestataire', city: '', inactiveDays: undefined as number | undefined, channel: 'in_app', subject: '', body: '', scheduleLater: false, scheduledAt: '' })

async function sendCampaign() {
  await withBusy(async () => {
    await $fetch('/api/admin/campaigns', {
      method: 'POST',
      body: {
        role: form.value.role || undefined,
        city: form.value.city || undefined,
        inactiveDays: form.value.inactiveDays,
        channel: form.value.channel,
        subject: form.value.subject || undefined,
        body: form.value.body,
        scheduledAt: form.value.scheduleLater && form.value.scheduledAt ? new Date(form.value.scheduledAt).getTime() : undefined,
      },
    })
    form.value.body = ''
    form.value.subject = ''
    await refreshCampaigns()
  })
}

const newTemplate = ref({ key: '', label: '', channel: 'in_app', subject: '', body: '' })
async function saveTemplate() {
  await withBusy(async () => {
    await $fetch('/api/admin/templates', { method: 'POST', body: newTemplate.value })
    newTemplate.value = { key: '', label: '', channel: 'in_app', subject: '', body: '' }
    await refreshTemplates()
  })
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.campaigns.title') }}</h1>
    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.campaigns.newTitle') }}</h2>
      <p class="mb-3 text-[11.5px] italic text-muted">{{ t('admin.campaigns.channelNote') }}</p>
      <div class="mb-3 flex flex-wrap gap-2">
        <select v-model="form.role" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
          <option value="">{{ t('admin.campaigns.segmentAll') }}</option>
          <option value="prestataire">{{ t('admin.nav.providers') }}</option>
          <option value="client">{{ t('admin.nav.clients') }}</option>
        </select>
        <input v-model="form.city" type="text" :placeholder="t('admin.providers.filterCity')" class="h-9 w-[130px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model.number="form.inactiveDays" type="number" :placeholder="t('admin.campaigns.inactiveDaysPlaceholder')" class="h-9 w-[160px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <select v-model="form.channel" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
          <option value="in_app">{{ t('admin.campaigns.channelInApp') }}</option>
          <option value="email">{{ t('admin.campaigns.channelEmail') }}</option>
          <option value="sms">{{ t('admin.campaigns.channelSms') }}</option>
          <option value="push">{{ t('admin.campaigns.channelPush') }}</option>
        </select>
      </div>
      <input v-model="form.subject" type="text" :placeholder="t('admin.providers.messageSubject')" class="mb-2 w-full rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark">
      <textarea v-model="form.body" rows="3" :placeholder="t('admin.providers.messageBody')" class="mb-3 w-full resize-none rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark" />
      <div class="mb-3 flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-[12.5px] text-dark">
          <input v-model="form.scheduleLater" type="checkbox">
          {{ t('admin.campaigns.scheduleLater') }}
        </label>
        <input v-if="form.scheduleLater" v-model="form.scheduledAt" type="datetime-local" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
      </div>
      <button type="button" class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60" :disabled="busy || !form.body" @click="sendCampaign">
        {{ form.scheduleLater ? t('admin.campaigns.scheduleCta') : t('admin.campaigns.sendCta') }}
      </button>
    </section>

    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.campaigns.historyTitle') }}</h2>
      <p v-if="campaignsData?.campaigns.length === 0" class="text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
      <table v-else class="w-full min-w-[600px] border-collapse text-[12.5px]">
        <thead>
          <tr class="border-b border-hairline text-left text-muted">
            <th class="py-2 font-semibold">{{ t('admin.campaigns.colSegment') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.campaigns.colChannel') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.campaigns.colRecipients') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.campaigns.colOpenRate') }}</th>
            <th class="py-2 font-semibold">{{ t('admin.campaigns.colDate') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="campaign in campaignsData?.campaigns" :key="campaign.id" class="border-b border-hairline last:border-0">
            <td class="py-2 text-dark">{{ campaign.segment }}</td>
            <td class="py-2 text-muted">{{ campaign.channel }}</td>
            <td class="py-2 text-muted">{{ campaign.recipientCount }}</td>
            <td class="py-2 text-muted">{{ campaign.channel === 'in_app' ? '—' : `${campaign.openCount}` }}</td>
            <td class="py-2 text-muted">{{ formatDate(campaign.sentAt ?? campaign.scheduledAt) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.campaigns.templatesTitle') }}</h2>
      <ul v-if="templatesData?.templates.length" class="mb-4 flex flex-col gap-1.5">
        <li v-for="template in templatesData.templates" :key="template.key" class="rounded-field border border-hairline p-2.5 text-[12px]">
          <p class="font-semibold text-dark">{{ template.label }} <span class="text-muted">({{ template.key }} · {{ template.channel }})</span></p>
          <p class="text-muted">{{ template.body }}</p>
        </li>
      </ul>
      <div class="flex flex-wrap items-end gap-2">
        <input v-model="newTemplate.key" type="text" :placeholder="t('admin.categories.contentKey')" class="h-9 w-[140px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="newTemplate.label" type="text" :placeholder="t('admin.categories.contentLabel')" class="h-9 w-[150px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="newTemplate.body" type="text" :placeholder="t('admin.campaigns.templateBodyPlaceholder')" class="h-9 min-w-[180px] flex-1 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy || !newTemplate.key" @click="saveTemplate">
          {{ t('admin.common.save') }}
        </button>
      </div>
    </section>
  </div>
</template>
