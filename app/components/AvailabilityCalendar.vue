<script setup lang="ts">
import type { UnavailabilityPeriod } from '~~/server/utils/providerAvailabilityStore'

/**
 * Calendrier de disponibilité en temps réel (#290) : le prestataire déclare
 * des périodes où il n'est pas disponible plutôt que l'inverse — sans
 * période déclarée, il reste visible dans les propositions de recherche.
 * Voir `server/utils/providerAvailabilityStore.ts` (consommé par
 * `providerDirectory.searchProviders`, donc aussi par le moteur de matching
 * de la demande) pour la règle d'exclusion appliquée côté serveur.
 */
defineEmits<{ saved: [] }>()

const { t, locale, locales } = useI18n({ useScope: 'global' })

const { data, refresh } = await useFetch<{ periods: UnavailabilityPeriod[] }>('/api/providers/availability')
const periods = computed(() => data.value?.periods ?? [])

const startDate = ref('')
const endDate = ref('')
const error = ref('')
const isSubmitting = ref(false)
const removingId = ref<string | null>(null)

const isValid = computed(() => !!startDate.value && !!endDate.value && endDate.value >= startDate.value)

async function addPeriod() {
  if (!isValid.value || isSubmitting.value) return
  isSubmitting.value = true
  error.value = ''
  try {
    await $fetch('/api/providers/availability', {
      method: 'POST',
      body: { startDate: startDate.value, endDate: endDate.value },
    })
    startDate.value = ''
    endDate.value = ''
    await refresh()
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('availabilityCalendar.errorSaveFailed'))
  } finally {
    isSubmitting.value = false
  }
}

async function removePeriod(id: string) {
  if (removingId.value) return
  removingId.value = id
  error.value = ''
  try {
    await $fetch(`/api/providers/availability/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('availabilityCalendar.errorRemoveFailed'))
  } finally {
    removingId.value = null
  }
}

function formatRange(period: UnavailabilityPeriod): string {
  const languageTag = (locales.value as Array<{ code: string, language?: string }>)
    .find((l) => l.code === locale.value)?.language ?? 'fr-FR'
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  const start = new Date(period.startDate).toLocaleDateString(languageTag, options)
  const end = new Date(period.endDate).toLocaleDateString(languageTag, options)
  return start === end ? start : `${start} → ${end}`
}
</script>

<template>
  <div>
    <p class="mb-3.5 text-[12.5px] leading-relaxed text-muted">
      {{ t('availabilityCalendar.description') }}
    </p>

    <div class="mb-3.5 flex gap-2">
      <div class="flex-1">
        <label for="availability-start" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('availabilityCalendar.fromLabel') }}</label>
        <input
          id="availability-start"
          v-model="startDate"
          type="date"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
      <div class="flex-1">
        <label for="availability-end" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('availabilityCalendar.toLabel') }}</label>
        <input
          id="availability-end"
          v-model="endDate"
          type="date"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
    </div>

    <button
      type="button"
      class="press mb-4 w-full rounded-field border border-primary py-2.5 text-[13px] font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!isValid || isSubmitting"
      @click="addPeriod"
    >
      {{ isSubmitting ? t('availabilityCalendar.adding') : t('availabilityCalendar.addCta') }}
    </button>

    <p v-if="error" class="mb-3 text-[12.5px] text-error">{{ error }}</p>

    <p v-if="periods.length === 0" class="text-[12.5px] text-muted">{{ t('availabilityCalendar.noPeriods') }}</p>

    <ul v-else class="space-y-2">
      <li
        v-for="period in periods"
        :key="period.id"
        class="flex items-center justify-between rounded-field border border-hairline px-3.5 py-2.5"
      >
        <span class="text-[13px] text-dark">{{ formatRange(period) }}</span>
        <button
          type="button"
          class="press text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="removingId === period.id"
          @click="removePeriod(period.id)"
        >
          {{ removingId === period.id ? t('availabilityCalendar.removing') : t('availabilityCalendar.remove') }}
        </button>
      </li>
    </ul>
  </div>
</template>
