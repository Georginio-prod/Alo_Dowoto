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

const { t } = useI18n({ useScope: 'global' })

/** Flooz/T-Money sont des marques (jamais traduites) ; seul le virement bancaire porte un libellé traduisible, d'où le calcul dans un computed plutôt qu'une constante figée à la locale de montage. */
const PAYOUT_OPTIONS = computed<{ value: PayoutMethod; label: string; color: string }[]>(() => [
  { value: 'flooz', label: 'Flooz', color: '#ff6600' },
  { value: 'tmoney', label: 'T-Money', color: '#ffc400' },
  { value: 'virement', label: t('authPayoutStep.bankTransfer'), color: '#0F2318' },
])

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
    saveError.value = t('authPayoutStep.errorIncomplete')
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
    saveError.value = apiErrorMessage(error, t('authPayoutStep.errorSaveFailed'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <label for="auth-city" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('authPayoutStep.cityLabel') }} <span class="text-error">*</span>
    </label>
    <input
      id="auth-city"
      v-model="city"
      type="text"
      required
      :placeholder="t('authPayoutStep.cityPlaceholder')"
      :aria-label="t('authPayoutStep.cityLabel')"
      aria-required="true"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      :class="touched && !isCityValid ? 'border-error' : 'border-hairline'"
    >
    <p v-if="touched && !isCityValid" class="mb-2.5 text-[12.5px] text-error">{{ t('authPayoutStep.cityRequired') }}</p>
    <div v-else class="mb-2.5" />

    <div class="mb-1.5 text-[13px] font-semibold text-dark">
      {{ t('authPayoutStep.payoutLabel') }} <span class="text-error">*</span>
    </div>
    <p class="mb-2 text-[12.5px] text-muted">{{ t('authPayoutStep.payoutSubtitle') }}</p>
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
      {{ t('authPayoutStep.payoutRequired') }}
    </p>
    <div v-else class="mb-2.5" />

    <p v-if="saveError" class="my-1 text-[12.5px] text-error">{{ saveError }}</p>

    <button
      type="button"
      class="press w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSaving || (touched && !isFormValid)"
      @click="submit"
    >
      {{ isSaving ? t('authPayoutStep.saving') : t('authPayoutStep.continueCta') }}
    </button>
  </div>
</template>
