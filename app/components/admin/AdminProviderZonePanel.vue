<script setup lang="ts">
import { SECTORS } from '~~/app/data/sectors'
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

/** Catégorie & zone d'intervention d'un prestataire (#dashboard-admin, module 2) — panneau autonome, extrait de la fiche prestataire. */
const props = defineProps<{
  providerId: string
  profile: { displayName: string, sector: string, city?: string, latitude?: number, longitude?: number, quartier?: string, rayonInterventionKm?: number } | null
  verified: boolean
}>()
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n({ useScope: 'global' })
const busy = ref(false)

const sectorEdit = ref('')
const zoneCity = ref('')
const zoneQuartier = ref('')
const zoneLat = ref<number | undefined>(undefined)
const zoneLng = ref<number | undefined>(undefined)
const zoneRadius = ref<number | undefined>(undefined)

watchEffect(() => {
  if (props.profile) {
    sectorEdit.value = props.profile.sector
    zoneCity.value = props.profile.city ?? ''
    zoneQuartier.value = props.profile.quartier ?? ''
    zoneLat.value = props.profile.latitude
    zoneLng.value = props.profile.longitude
    zoneRadius.value = props.profile.rayonInterventionKm
  }
})

async function saveSector() {
  busy.value = true
  try {
    await $fetch(`/api/admin/providers/${props.providerId}/categories`, { method: 'PATCH', body: { sector: sectorEdit.value } })
    emit('saved')
  } finally {
    busy.value = false
  }
}

async function saveZone() {
  busy.value = true
  try {
    await $fetch(`/api/admin/providers/${props.providerId}/zone`, {
      method: 'PATCH',
      body: { city: zoneCity.value || undefined, quartier: zoneQuartier.value || undefined, latitude: zoneLat.value, longitude: zoneLng.value, rayonInterventionKm: zoneRadius.value },
    })
    emit('saved')
  } finally {
    busy.value = false
  }
}

const mapProviders = computed<ProviderSearchResult[]>(() => {
  if (!props.profile?.latitude || !props.profile.longitude) return []
  return [{
    id: props.providerId,
    displayName: props.profile.displayName,
    sector: props.profile.sector,
    subSector: props.profile.sector,
    city: props.profile.city ?? '',
    verified: props.verified,
    rating: 0,
    reviewCount: 0,
    priceFrom: 0,
    photoUrl: null,
    latitude: props.profile.latitude,
    longitude: props.profile.longitude,
    quartier: props.profile.quartier ?? null,
    distanceKm: null,
  }]
})
</script>

<template>
  <section class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
    <h2 class="mb-3 text-[13.5px] font-bold text-dark">{{ t('admin.providers.categoriesZoneTitle') }}</h2>
    <div class="mb-3 flex flex-wrap items-end gap-2">
      <div>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.filterSector') }}</label>
        <select v-model="sectorEdit" class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
          <option v-for="sector in SECTORS" :key="sector.slug" :value="sector.slug">{{ sector.name }}</option>
        </select>
      </div>
      <button type="button" class="press h-9 rounded-field border border-hairline bg-white px-3.5 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="saveSector">
        {{ t('admin.common.save') }}
      </button>
    </div>
    <div class="flex flex-wrap items-end gap-2">
      <div>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.filterCity') }}</label>
        <input v-model="zoneCity" type="text" class="h-9 w-[130px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
      </div>
      <div>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneQuartier') }}</label>
        <input v-model="zoneQuartier" type="text" class="h-9 w-[130px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
      </div>
      <div>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneLat') }}</label>
        <input v-model.number="zoneLat" type="number" step="0.0001" class="h-9 w-[110px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
      </div>
      <div>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneLng') }}</label>
        <input v-model.number="zoneLng" type="number" step="0.0001" class="h-9 w-[110px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
      </div>
      <div>
        <label class="mb-1 block text-[11.5px] font-semibold text-muted">{{ t('admin.providers.zoneRadius') }}</label>
        <input v-model.number="zoneRadius" type="number" min="1" class="h-9 w-[90px] rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark">
      </div>
      <button type="button" class="press h-9 rounded-field border border-hairline bg-white px-3.5 text-[12.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="saveZone">
        {{ t('admin.common.save') }}
      </button>
    </div>
    <ClientOnly>
      <div v-if="mapProviders.length > 0" class="mt-3 h-[220px] overflow-hidden rounded-field border border-hairline">
        <ProviderMap :providers="mapProviders" />
      </div>
    </ClientOnly>
  </section>
</template>
