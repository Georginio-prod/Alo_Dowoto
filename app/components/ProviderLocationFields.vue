<script setup lang="ts">
import { listQuartiers } from '~~/app/data/regions'

/**
 * Localisation complète du prestataire (#geoloc, 1.2) : ville (existant),
 * quartier, position précise (carte + géolocalisation), rayon
 * d'intervention, points de repère et réglage de vie privée — extrait de
 * ProfessionalProfileForm.vue pour rester sous la limite de lignes par
 * fichier, sur le même principe que LocationRadiusPicker.vue côté recherche.
 */
const city = defineModel<string>('city', { required: true })
const latitude = defineModel<number | undefined>('latitude')
const longitude = defineModel<number | undefined>('longitude')
const quartier = defineModel<string>('quartier', { required: true })
const adresse = defineModel<string>('adresse', { required: true })
const pointsDeRepere = defineModel<string>('pointsDeRepere', { required: true })
const rayonInterventionKm = defineModel<number | undefined>('rayonInterventionKm')
const positionApproximative = defineModel<boolean>('positionApproximative', { required: true })

const { t } = useI18n({ useScope: 'global' })

const quartiers = listQuartiers()

const isLocating = ref(false)
const locationError = ref('')
const isClearingPosition = ref(false)
const clearPositionError = ref('')

/**
 * Supprime la position enregistrée côté serveur (#geoloc, partie 3 — vie
 * privée), pas seulement le brouillon local : distinct d'un simple vidage
 * des champs, qui n'aurait aucun effet tant que « Enregistrer » n'est pas
 * cliqué plus bas (voir ProfessionalProfileForm.vue).
 */
async function clearStoredPosition() {
  if (isClearingPosition.value) return
  isClearingPosition.value = true
  clearPositionError.value = ''
  try {
    await $fetch('/api/providers/me/position', { method: 'DELETE' })
    latitude.value = undefined
    longitude.value = undefined
  } catch (fetchError) {
    clearPositionError.value = apiErrorMessage(fetchError, t('providerLocationFields.errorClearPosition'))
  } finally {
    isClearingPosition.value = false
  }
}

function useCurrentPosition() {
  if (isLocating.value) return
  if (!navigator.geolocation) {
    locationError.value = t('providerLocationFields.errorGeoUnavailable')
    return
  }
  isLocating.value = true
  locationError.value = ''
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitude.value = position.coords.latitude
      longitude.value = position.coords.longitude
      isLocating.value = false
    },
    (geoError) => {
      // Sans `timeout` explicite, la valeur par défaut est Infinity : voir
      // ProfessionalProfileForm.vue (comportement d'origine conservé ici).
      locationError.value = geoError.code === geoError.TIMEOUT
        ? t('providerLocationFields.errorTimeout')
        : t('providerLocationFields.errorDenied')
      isLocating.value = false
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
  )
}
</script>

<template>
  <div>
    <label for="plf-city" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('providerLocationFields.cityLabel') }}</label>
    <input
      id="plf-city"
      v-model="city"
      type="text"
      :placeholder="t('providerLocationFields.cityPlaceholder')"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >
    <button
      type="button"
      class="press mb-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary underline disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isLocating"
      @click="useCurrentPosition"
    >
      <span v-if="isLocating" class="size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-primary/30 border-t-primary" aria-hidden="true" />
      {{ isLocating ? t('providerLocationFields.locating') : latitude !== undefined ? t('providerLocationFields.updatePosition') : t('providerLocationFields.useCurrentPosition') }}
    </button>
    <button
      v-if="latitude !== undefined"
      type="button"
      class="press mb-1.5 ml-3 text-[12.5px] font-semibold text-error underline disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isClearingPosition"
      @click="clearStoredPosition"
    >
      {{ isClearingPosition ? t('providerLocationFields.clearingPosition') : t('providerLocationFields.clearPosition') }}
    </button>
    <p v-if="locationError" class="mb-3.5 text-[12.5px] text-error">{{ locationError }}</p>
    <p v-if="clearPositionError" class="mb-3.5 text-[12.5px] text-error">{{ clearPositionError }}</p>

    <label for="plf-quartier" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('providerLocationFields.quartierLabel') }}</label>
    <select
      id="plf-quartier"
      v-model="quartier"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >
      <option value="">{{ t('providerLocationFields.quartierNotSet') }}</option>
      <option v-for="option in quartiers" :key="option.slug" :value="option.slug">{{ option.name }}</option>
    </select>

    <p class="mb-1.5 text-[13px] font-semibold text-dark">{{ t('providerLocationFields.precisePositionLabel') }}</p>
    <PositionMapPicker v-model:latitude="latitude" v-model:longitude="longitude" />

    <label for="plf-repere" class="mb-1.5 mt-3.5 block text-[13px] font-semibold text-dark">
      {{ t('providerLocationFields.landmarkLabel') }}
    </label>
    <input
      id="plf-repere"
      v-model="pointsDeRepere"
      type="text"
      :placeholder="t('providerLocationFields.landmarkPlaceholder')"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <label for="plf-adresse" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('providerLocationFields.addressLabel') }}</label>
    <input
      id="plf-adresse"
      v-model="adresse"
      type="text"
      :placeholder="t('providerLocationFields.addressPlaceholder')"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <label for="plf-rayon" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ rayonInterventionKm ? t('providerLocationFields.radiusLabelWithValue', { km: rayonInterventionKm }) : t('providerLocationFields.radiusLabel') }}
    </label>
    <input
      id="plf-rayon"
      :value="rayonInterventionKm ?? 10"
      type="range"
      min="1"
      max="50"
      step="1"
      class="mb-3.5 w-full accent-primary"
      @input="rayonInterventionKm = ($event.target as HTMLInputElement).valueAsNumber"
    >

    <label class="mb-3.5 flex items-start gap-2.5 text-[13px] text-dark">
      <input v-model="positionApproximative" type="checkbox" class="mt-0.5 size-4 accent-primary">
      <span>
        {{ t('providerLocationFields.privacyLabel') }}
      </span>
    </label>
  </div>
</template>
