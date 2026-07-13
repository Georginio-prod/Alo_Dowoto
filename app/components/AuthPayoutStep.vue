<script setup lang="ts">
import type { PayoutMethod } from '~~/server/utils/providerStore'

/**
 * Étape « Localisation & mode de rémunération » de l'inscription
 * prestataire (#123) : jusqu'ici, aucun contrôle n'existait pour choisir un
 * mode de rémunération WorkTogo — le "bug" décrit par #123 est l'absence
 * totale de liaison état/backend, corrigée ici par un composant dédié dont
 * la sélection est explicitement liée à `payoutMethod` et sauvegardée via
 * PATCH /api/providers/me.
 */

const props = defineProps<{ sectorSlug: string }>()
const emit = defineEmits<{ saved: [] }>()

const PAYOUT_OPTIONS: { value: PayoutMethod; label: string; color: string }[] = [
  { value: 'flooz', label: 'Flooz', color: '#ff6600' },
  { value: 'tmoney', label: 'T-Money', color: '#ffc400' },
  { value: 'virement', label: 'Virement bancaire', color: '#0F2318' },
]

const city = ref('')
const payoutMethod = ref<PayoutMethod | null>(null)
const saveError = ref('')
const isSaving = ref(false)

function selectPayoutMethod(method: PayoutMethod) {
  payoutMethod.value = method
  saveError.value = ''
}

async function submit() {
  if (isSaving.value) return
  isSaving.value = true
  saveError.value = ''
  try {
    await $fetch('/api/providers/me', {
      method: 'PATCH',
      body: {
        sector: props.sectorSlug,
        city: city.value.trim() || undefined,
        payoutMethod: payoutMethod.value ?? undefined,
      },
    })
    emit('saved')
  } catch (error) {
    const statusMessage = (error as { statusMessage?: string })?.statusMessage
    saveError.value = statusMessage || "L'enregistrement a échoué. Réessayez."
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <label for="auth-city" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Localisation / zone d'intervention
    </label>
    <input
      id="auth-city"
      v-model="city"
      type="text"
      placeholder="Ex. Lomé, Kara, Kpalimé…"
      aria-label="Localisation"
      class="mb-4 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <div class="mb-1.5 text-[13px] font-semibold text-dark">Mode de rémunération WorkTogo</div>
    <p class="mb-2 text-[12.5px] text-muted">Comment souhaitez-vous recevoir vos paiements ?</p>
    <div class="mb-4 grid grid-cols-3 gap-2">
      <button
        v-for="option in PAYOUT_OPTIONS"
        :key="option.value"
        type="button"
        class="press flex flex-col items-center gap-1.5 rounded-field border-2 py-3.5"
        :class="payoutMethod === option.value ? 'border-primary bg-primary/10' : 'border-hairline bg-white'"
        :aria-pressed="payoutMethod === option.value"
        @click="selectPayoutMethod(option.value)"
      >
        <span class="h-6 w-6 rounded-[8px]" :style="{ background: option.color }" />
        <span class="text-center text-[12px] font-semibold text-dark">{{ option.label }}</span>
      </button>
    </div>

    <p v-if="saveError" class="my-1 text-[12.5px] text-error">{{ saveError }}</p>

    <button
      type="button"
      class="press w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSaving"
      @click="submit"
    >
      {{ isSaving ? 'Enregistrement…' : 'Continuer' }}
    </button>
  </div>
</template>
