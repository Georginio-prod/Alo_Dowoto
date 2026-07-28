<script setup lang="ts">
import type { Mobility, ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Préférences prestataire (tarifs, mobilité, disponibilité) — extrait de
 * app/pages/prestataire/preferences.vue (#hub-profil-modales) pour être
 * réutilisé à la fois par cette page dédiée et par la fenêtre ouverte
 * depuis le hub `/profil`.
 */
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n({ useScope: 'global' })

const MOBILITY_OPTIONS = computed<{ value: Mobility; label: string }[]>(() => [
  { value: 'client', label: t('preferencesForm.mobilityClient') },
  { value: 'atelier', label: t('preferencesForm.mobilityAtelier') },
  { value: 'les_deux', label: t('preferencesForm.mobilityBoth') },
])

const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const existing = data.value?.profile ?? null

const rateFrom = ref<number | null>(existing?.rateFrom ?? null)
const rateTo = ref<number | null>(existing?.rateTo ?? null)
const mobility = ref<Mobility | null>(existing?.mobility ?? null)
const availability = ref(existing?.availability ?? '')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  if (rateFrom.value !== null && rateTo.value !== null && rateTo.value < rateFrom.value) {
    error.value = t('preferencesForm.errorRateInvalid')
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', {
      method: 'PATCH',
      body: {
        rateFrom: rateFrom.value ?? undefined,
        rateTo: rateTo.value ?? undefined,
        mobility: mobility.value ?? undefined,
        availability: availability.value.trim() || undefined,
      },
    })
    success.value = true
    emit('saved')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('preferencesForm.errorSaveFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-3.5 flex gap-2">
      <div class="flex-1">
        <label for="pref-rate-from" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('preferencesForm.rateFromLabel') }}</label>
        <input
          id="pref-rate-from"
          v-model.number="rateFrom"
          type="number"
          min="0"
          :placeholder="t('preferencesForm.rateFromPlaceholder')"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
      <div class="flex-1">
        <label for="pref-rate-to" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('preferencesForm.rateToLabel') }}</label>
        <input
          id="pref-rate-to"
          v-model.number="rateTo"
          type="number"
          min="0"
          :placeholder="t('preferencesForm.rateToPlaceholder')"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
    </div>

    <div class="mb-1.5 text-[13px] font-semibold text-dark">{{ t('preferencesForm.locationTypeLabel') }}</div>
    <div class="mb-3.5 grid grid-cols-3 gap-2">
      <button
        v-for="option in MOBILITY_OPTIONS"
        :key="option.value"
        type="button"
        class="press rounded-field border-2 py-3 text-center text-[12px] font-semibold text-dark"
        :class="mobility === option.value ? 'border-primary bg-primary/10' : 'border-hairline bg-white'"
        :aria-pressed="mobility === option.value"
        @click="mobility = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <label for="pref-availability" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('preferencesForm.availabilityLabel') }}</label>
    <input
      id="pref-availability"
      v-model="availability"
      type="text"
      :placeholder="t('preferencesForm.availabilityPlaceholder')"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">{{ t('preferencesForm.success') }}</p>
    <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? t('preferencesForm.saving') : t('preferencesForm.save') }}
    </button>
  </div>
</template>
