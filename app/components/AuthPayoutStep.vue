<script setup lang="ts">
import type { PayoutMethod } from '~~/server/utils/providerStore'

/**
 * Étape « Localisation & mode de rémunération » de l'inscription
 * prestataire (#123 : composant fonctionnel et persisté ; #124 : les deux
 * champs sont obligatoires, contrôlés côté client ET côté serveur — voir
 * la validation dupliquée dans server/api/providers/me.patch.ts).
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
const touched = ref(false)

const isCityValid = computed(() => city.value.trim().length > 0)
const isPayoutValid = computed(() => payoutMethod.value !== null)
const isFormValid = computed(() => isCityValid.value && isPayoutValid.value)

function selectPayoutMethod(method: PayoutMethod) {
  payoutMethod.value = method
  saveError.value = ''
}

async function submit() {
  touched.value = true
  if (!isFormValid.value) {
    saveError.value = 'Merci de renseigner votre localisation et votre mode de rémunération pour continuer.'
    return
  }

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
    saveError.value = apiErrorMessage(error, "L'enregistrement a échoué. Réessayez.")
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <label for="auth-city" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Localisation / zone d'intervention <span class="text-error">*</span>
    </label>
    <input
      id="auth-city"
      v-model="city"
      type="text"
      required
      placeholder="Ex. Lomé, Kara, Kpalimé…"
      aria-label="Localisation"
      aria-required="true"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      :class="touched && !isCityValid ? 'border-error' : 'border-hairline'"
    >
    <p v-if="touched && !isCityValid" class="mb-2.5 text-[12.5px] text-error">Ce champ est obligatoire.</p>
    <div v-else class="mb-2.5" />

    <div class="mb-1.5 text-[13px] font-semibold text-dark">
      Mode de rémunération WorkTogo <span class="text-error">*</span>
    </div>
    <p class="mb-2 text-[12.5px] text-muted">Comment souhaitez-vous recevoir vos paiements ?</p>
    <div
      class="mb-1.5 grid grid-cols-3 gap-2 rounded-field"
      :class="{ 'outline outline-2 outline-error/60': touched && !isPayoutValid }"
    >
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
    <p v-if="touched && !isPayoutValid" class="mb-2.5 text-[12.5px] text-error">
      Sélectionnez un mode de rémunération.
    </p>
    <div v-else class="mb-2.5" />

    <p v-if="saveError" class="my-1 text-[12.5px] text-error">{{ saveError }}</p>

    <button
      type="button"
      class="press w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSaving || (touched && !isFormValid)"
      @click="submit"
    >
      {{ isSaving ? 'Enregistrement…' : 'Continuer' }}
    </button>
  </div>
</template>
