<script setup lang="ts">
import { RADIUS_SLIDER_OPTIONS_KM } from '~~/app/data/searchRadius'
import { listQuartiers } from '~~/app/data/regions'

/**
 * Position et rayon de recherche (#geoloc, 1.1/1.3) : géolocalisation
 * navigateur avec consentement explicite (bouton, jamais automatique) et
 * repli obligatoire par quartier — jamais bloquant, l'utilisateur garde
 * toujours la main pour corriger ou remplacer sa position. Le géocodage
 * inverse n'est qu'indicatif (libellé affiché) : un échec n'empêche jamais
 * la recherche, qui repose uniquement sur les coordonnées déjà obtenues.
 */
const latitude = defineModel<number | undefined>('latitude')
const longitude = defineModel<number | undefined>('longitude')
const quartier = defineModel<string>('quartier', { required: true })
const radiusKm = defineModel<number>('radiusKm', { required: true })

const quartiers = listQuartiers()

const isLocating = ref(false)
const locationLabel = ref('')
const locationError = ref('')

function clearLocation() {
  latitude.value = undefined
  longitude.value = undefined
  locationLabel.value = ''
}

async function useMyLocation() {
  if (isLocating.value) return
  if (!navigator.geolocation) {
    locationError.value = "La géolocalisation n'est pas disponible sur cet appareil."
    return
  }
  isLocating.value = true
  locationError.value = ''

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      latitude.value = position.coords.latitude
      longitude.value = position.coords.longitude
      // Choisir sa position prime sur un quartier sélectionné précédemment
      // (évite d'envoyer les deux critères à la fois côté recherche).
      quartier.value = ''
      locationLabel.value = 'Position détectée'

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=fr`,
        )
        const data = await response.json()
        const suburb: string | undefined = data?.address?.suburb ?? data?.address?.neighbourhood ?? data?.address?.city_district
        if (suburb) locationLabel.value = `Position détectée — ${suburb}`
      } catch {
        // Purement indicatif : les coordonnées ci-dessus suffisent déjà.
      } finally {
        isLocating.value = false
      }
    },
    () => {
      locationError.value = 'Localisation refusée ou indisponible. Choisissez votre quartier ci-dessous.'
      isLocating.value = false
    },
  )
}

function onQuartierChange() {
  if (quartier.value) clearLocation()
}

function onRadiusInput(event: Event) {
  const index = (event.target as HTMLInputElement).valueAsNumber
  radiusKm.value = RADIUS_SLIDER_OPTIONS_KM[index] ?? radiusKm.value
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-4">
    <p class="mb-3 text-[13px] font-bold text-dark">Autour de moi</p>

    <div class="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="press rounded-field bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="isLocating"
        @click="useMyLocation"
      >
        {{ isLocating ? 'Localisation…' : '📍 Utiliser ma position actuelle' }}
      </button>
      <button
        v-if="latitude !== undefined"
        type="button"
        class="press text-[12px] font-semibold text-muted underline"
        @click="clearLocation"
      >
        Retirer ma position
      </button>
    </div>
    <p v-if="locationLabel" class="mb-3 text-[12px] font-semibold text-primary">{{ locationLabel }}</p>
    <p v-if="locationError" class="mb-3 text-[12px] text-error">{{ locationError }}</p>

    <div class="mb-4">
      <label for="picker-quartier" class="mb-2 block text-[11.5px] font-bold uppercase tracking-wide text-muted">
        Ou choisir un quartier (Région Maritime)
      </label>
      <select
        id="picker-quartier"
        v-model="quartier"
        class="h-[42px] w-full rounded-field border border-hairline bg-white px-3 text-[13.5px] text-ink outline-none focus:border-primary"
        @change="onQuartierChange"
      >
        <option value="">Tous quartiers</option>
        <option v-for="option in quartiers" :key="option.slug" :value="option.slug">{{ option.name }}</option>
      </select>
    </div>

    <div>
      <label for="picker-radius" class="mb-2 block text-[11.5px] font-bold uppercase tracking-wide text-muted">
        Rayon de recherche : {{ radiusKm }} km
      </label>
      <input
        id="picker-radius"
        type="range"
        min="0"
        :max="RADIUS_SLIDER_OPTIONS_KM.length - 1"
        step="1"
        :value="RADIUS_SLIDER_OPTIONS_KM.indexOf(radiusKm)"
        class="w-full accent-primary"
        @input="onRadiusInput"
      >
      <div class="mt-1 flex justify-between text-[10.5px] text-muted">
        <span v-for="option in RADIUS_SLIDER_OPTIONS_KM" :key="option">{{ option }}</span>
      </div>
    </div>
  </div>
</template>
