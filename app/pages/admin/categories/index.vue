<script setup lang="ts">
/** Catégories de services & contenu (#dashboard-admin, module 10). */
definePageMeta({ layout: 'admin', middleware: 'auth' })

interface SubSector { id: string, name: string }
interface Sector { id: string, slug: string, name: string, emoji: string, active: boolean, order: number, subSectors: SubSector[] }
interface ContentBlock { key: string, label: string, value: string }

const { t } = useI18n({ useScope: 'global' })

const { data: sectorsData, refresh: refreshSectors } = await useFetch<{ sectors: Sector[] }>('/api/admin/categories')
const { data: contentData, refresh: refreshContent } = await useFetch<{ content: ContentBlock[] }>('/api/admin/content')

const busy = ref(false)
const toast = ref('')
async function withBusy(action: () => Promise<void>) {
  busy.value = true
  try { await action() } catch (err) { toast.value = err instanceof Error ? err.message : t('admin.common.error') } finally { busy.value = false }
}

const newSector = ref({ slug: '', name: '', emoji: '🛠️' })
async function createSector() {
  await withBusy(async () => {
    await $fetch('/api/admin/categories', { method: 'POST', body: newSector.value })
    newSector.value = { slug: '', name: '', emoji: '🛠️' }
    await refreshSectors()
  })
}

async function toggleSector(sector: Sector) {
  await withBusy(async () => { await $fetch(`/api/admin/categories/${sector.id}`, { method: 'PATCH', body: { active: !sector.active } }); await refreshSectors() })
}

async function renameSector(sector: Sector, name: string) {
  await withBusy(async () => { await $fetch(`/api/admin/categories/${sector.id}`, { method: 'PATCH', body: { name } }); await refreshSectors() })
}

async function move(sector: Sector, direction: -1 | 1) {
  await withBusy(async () => { await $fetch(`/api/admin/categories/${sector.id}`, { method: 'PATCH', body: { order: sector.order + direction } }); await refreshSectors() })
}

const newContent = ref({ key: '', label: '', value: '' })
async function saveContent() {
  await withBusy(async () => {
    await $fetch('/api/admin/content', { method: 'POST', body: newContent.value })
    newContent.value = { key: '', label: '', value: '' }
    await refreshContent()
  })
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.categories.title') }}</h1>
    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.categories.sectorsTitle') }}</h2>
      <p v-if="sectorsData?.sectors.length === 0" class="mb-3 text-[12.5px] text-muted">{{ t('admin.common.empty') }}</p>
      <ul v-else class="mb-4 flex flex-col gap-1.5">
        <li v-for="sector in sectorsData?.sectors" :key="sector.id" class="flex flex-wrap items-center gap-2 rounded-field border border-hairline p-2.5">
          <span class="text-[16px]">{{ sector.emoji }}</span>
          <input
            class="min-w-0 flex-1 border-none bg-transparent text-[13px] font-semibold text-dark outline-none"
            :value="sector.name"
            @change="renameSector(sector, ($event.target as HTMLInputElement).value)"
          >
          <AdminBadge :tone="sector.active ? 'success' : 'neutral'">{{ sector.active ? t('admin.providers.statusActive') : t('admin.plans.disabled') }}</AdminBadge>
          <button type="button" class="press rounded-field border border-hairline bg-white px-2 py-1 text-[11px]" :disabled="busy" @click="move(sector, -1)">↑</button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-2 py-1 text-[11px]" :disabled="busy" @click="move(sector, 1)">↓</button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-2.5 py-1 text-[11px] font-semibold text-dark" :disabled="busy" @click="toggleSector(sector)">
            {{ sector.active ? t('admin.plans.disableCta') : t('admin.plans.enableCta') }}
          </button>
        </li>
      </ul>
      <div class="flex flex-wrap items-end gap-2">
        <input v-model="newSector.emoji" type="text" class="h-9 w-[60px] rounded-field border border-hairline bg-white px-2.5 text-center text-[14px]">
        <input v-model="newSector.slug" type="text" :placeholder="t('admin.plans.slugPlaceholder')" class="h-9 w-[110px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="newSector.name" type="text" :placeholder="t('admin.categories.sectorNamePlaceholder')" class="h-9 min-w-[160px] flex-1 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy || !newSector.slug || !newSector.name" @click="createSector">
          {{ t('admin.common.create') }}
        </button>
      </div>
    </section>

    <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <h2 class="mb-1 text-[13.5px] font-bold text-dark">{{ t('admin.categories.contentTitle') }}</h2>
      <p class="mb-3 text-[11.5px] italic text-muted">{{ t('admin.categories.contentNote') }}</p>
      <ul v-if="contentData?.content.length" class="mb-4 flex flex-col gap-1.5">
        <li v-for="block in contentData.content" :key="block.key" class="rounded-field border border-hairline p-2.5 text-[12px]">
          <p class="font-semibold text-dark">{{ block.label }} <span class="text-muted">({{ block.key }})</span></p>
          <p class="text-muted">{{ block.value }}</p>
        </li>
      </ul>
      <div class="flex flex-wrap items-end gap-2">
        <input v-model="newContent.key" type="text" :placeholder="t('admin.categories.contentKey')" class="h-9 w-[120px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="newContent.label" type="text" :placeholder="t('admin.categories.contentLabel')" class="h-9 w-[140px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <input v-model="newContent.value" type="text" :placeholder="t('admin.categories.contentValue')" class="h-9 min-w-[180px] flex-1 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
        <button type="button" class="press h-9 rounded-field bg-primary px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60" :disabled="busy || !newContent.key" @click="saveContent">
          {{ t('admin.common.save') }}
        </button>
      </div>
    </section>
  </div>
</template>
