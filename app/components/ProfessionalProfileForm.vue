<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { PayoutMethod, ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Édition du profil professionnel prestataire (secteur, localisation, mode
 * de rémunération, description, photo) — extrait de
 * app/pages/prestataire/profil-professionnel.vue (#hub-profil-modales) pour
 * être réutilisé à la fois par cette page dédiée et par la fenêtre ouverte
 * depuis le hub `/profil`. Le tarif vit sur PreferencesForm.vue.
 */
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n({ useScope: 'global' })

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

/** Flooz/T-Money sont des marques (jamais traduites) ; seul le virement bancaire porte un libellé traduisible. */
const PAYOUT_OPTIONS = computed<{ value: PayoutMethod; label: string; color: string }[]>(() => [
  { value: 'flooz', label: 'Flooz', color: '#ff6600' },
  { value: 'tmoney', label: 'T-Money', color: '#ffc400' },
  { value: 'virement', label: t('professionalProfileForm.bankTransfer'), color: '#0F2318' },
])

const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const existing = data.value?.profile ?? null

const sector = ref(existing?.sector ?? '')
const city = ref(existing?.city ?? '')
const latitude = ref<number | undefined>(existing?.latitude)
const longitude = ref<number | undefined>(existing?.longitude)
const quartier = ref(existing?.quartier ?? '')
const adresse = ref(existing?.adresse ?? '')
const pointsDeRepere = ref(existing?.pointsDeRepere ?? '')
const rayonInterventionKm = ref<number | undefined>(existing?.rayonInterventionKm)
const positionApproximative = ref(existing?.positionApproximative ?? true)
const payoutMethod = ref<PayoutMethod | null>(existing?.payoutMethod ?? null)
const description = ref(existing?.description ?? '')
const photoUrl = ref<string | null>(existing?.photoUrl ?? null)
const photoFileName = ref('')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)


function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  error.value = ''
  if (!ACCEPTED_TYPES.includes(file.type)) {
    error.value = t('professionalProfileForm.errorFormat')
    input.value = ''
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    error.value = t('professionalProfileForm.errorSize')
    input.value = ''
    return
  }

  photoUrl.value = await readFileAsDataUrl(file)
  photoFileName.value = file.name
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  if (!sector.value || !city.value.trim() || !payoutMethod.value) {
    error.value = t('professionalProfileForm.errorRequired')
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', {
      method: 'PATCH',
      body: {
        sector: sector.value,
        city: city.value.trim(),
        latitude: latitude.value,
        longitude: longitude.value,
        quartier: quartier.value || undefined,
        adresse: adresse.value.trim() || undefined,
        pointsDeRepere: pointsDeRepere.value.trim() || undefined,
        rayonInterventionKm: rayonInterventionKm.value,
        positionApproximative: positionApproximative.value,
        payoutMethod: payoutMethod.value,
        description: description.value.trim() || undefined,
        photoUrl: photoUrl.value ?? undefined,
      },
    })
    success.value = true
    emit('saved')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('professionalProfileForm.errorSaveFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <label for="pp-photo" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('professionalProfileForm.photoLabel') }}</label>
    <label
      for="pp-photo"
      class="press mb-3.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
    >
      {{ photoFileName || (photoUrl ? t('professionalProfileForm.photoSaved') : t('professionalProfileForm.choosePhoto')) }}
    </label>
    <input id="pp-photo" type="file" accept="image/jpeg,image/png" class="sr-only" @change="onPhotoSelected">

    <label for="pp-sector" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('professionalProfileForm.sectorLabel') }}</label>
    <select
      id="pp-sector"
      v-model="sector"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >
      <option value="" disabled>{{ t('professionalProfileForm.chooseSector') }}</option>
      <option v-for="s in SECTORS" :key="s.slug" :value="s.slug">{{ s.emoji }} {{ s.name }}</option>
    </select>

    <ProviderLocationFields
      v-model:city="city"
      v-model:latitude="latitude"
      v-model:longitude="longitude"
      v-model:quartier="quartier"
      v-model:adresse="adresse"
      v-model:points-de-repere="pointsDeRepere"
      v-model:rayon-intervention-km="rayonInterventionKm"
      v-model:position-approximative="positionApproximative"
    />

    <label for="pp-description" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('professionalProfileForm.descriptionLabel') }}</label>
    <textarea
      id="pp-description"
      v-model="description"
      rows="3"
      :placeholder="t('professionalProfileForm.descriptionPlaceholder')"
      class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[14.5px] text-ink outline-none focus:border-primary"
    />

    <div class="mb-1.5 text-[13px] font-semibold text-dark">{{ t('professionalProfileForm.payoutLabel') }}</div>
    <div class="mb-3.5 grid grid-cols-3 gap-2">
      <button
        v-for="option in PAYOUT_OPTIONS"
        :key="option.value"
        type="button"
        class="press flex flex-col items-center gap-1.5 rounded-field border-2 py-3.5"
        :class="payoutMethod === option.value ? 'border-primary bg-primary/10' : 'border-hairline bg-white'"
        :aria-pressed="payoutMethod === option.value"
        @click="payoutMethod = option.value"
      >
        <span class="h-6 w-6 rounded-[8px]" :style="{ background: option.color }" />
        <span class="text-center text-[12px] font-semibold text-dark">{{ option.label }}</span>
      </button>
    </div>

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">{{ t('professionalProfileForm.success') }}</p>
    <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? t('professionalProfileForm.saving') : t('professionalProfileForm.save') }}
    </button>
  </div>
</template>
