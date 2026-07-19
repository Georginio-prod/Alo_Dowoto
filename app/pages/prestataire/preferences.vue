<script setup lang="ts">
import type { Mobility, ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Préférences prestataire (#hub-profil-prestataire) : fourchette de tarifs,
 * mobilité et disponibilité. Le tarif vivait auparavant sur
 * profil-professionnel.vue — regroupé ici avec les autres préférences pour
 * éviter deux surfaces d'édition du même champ.
 */
definePageMeta({ layout: 'blank', middleware: 'auth', authRole: 'prestataire' })

const MOBILITY_OPTIONS: { value: Mobility; label: string }[] = [
  { value: 'client', label: 'Chez le client' },
  { value: 'atelier', label: 'À mon atelier' },
  { value: 'les_deux', label: 'Les deux' },
]

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
    error.value = 'Le tarif maximum doit être supérieur ou égal au tarif minimum.'
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
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, "L'enregistrement a échoué. Réessayez.")
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/profil" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour au profil</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
        <p class="mt-1 text-[13.5px] text-muted">Vos tarifs et vos conditions d'intervention.</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">Préférences</h1>

        <div class="mb-3.5 flex gap-2">
          <div class="flex-1">
            <label for="pref-rate-from" class="mb-1.5 block text-[13px] font-semibold text-dark">Tarif min. (F CFA)</label>
            <input
              id="pref-rate-from"
              v-model.number="rateFrom"
              type="number"
              min="0"
              placeholder="Ex. 3000"
              class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
            >
          </div>
          <div class="flex-1">
            <label for="pref-rate-to" class="mb-1.5 block text-[13px] font-semibold text-dark">Tarif max. (F CFA)</label>
            <input
              id="pref-rate-to"
              v-model.number="rateTo"
              type="number"
              min="0"
              placeholder="Ex. 10000"
              class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
            >
          </div>
        </div>

        <div class="mb-1.5 text-[13px] font-semibold text-dark">Lieu d'intervention</div>
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

        <label for="pref-availability" class="mb-1.5 block text-[13px] font-semibold text-dark">Disponibilité</label>
        <input
          id="pref-availability"
          v-model="availability"
          type="text"
          placeholder="Ex. Lun-Ven, 8h-18h"
          class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">Préférences mises à jour.</p>
        <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

        <button
          type="button"
          class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isSubmitting"
          @click="submit"
        >
          {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>
