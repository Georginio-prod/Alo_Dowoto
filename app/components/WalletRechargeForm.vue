<script setup lang="ts">
/**
 * Formulaire de recharge du portefeuille WorkTogo (#190, epic #191) :
 * choix T-Money / Flooz, numéro mobile money, montant — même mécanique de
 * confirmation (polling) que app/pages/paiement.vue pour les paiements
 * d'abonnement.
 */
type Provider = 'flooz' | 'tmoney'
type Step = 'idle' | 'processing' | 'success'
interface Recharge {
  id: string
  status: 'pending' | 'confirmed' | 'failed'
}

const emit = defineEmits<{ confirmed: [] }>()

const POLL_INTERVAL_MS = 1500
const MIN_AMOUNT = 500

const step = ref<Step>('idle')
const provider = ref<Provider>('flooz')
const phone = ref('')
const amount = ref<number | null>(null)
const isSubmitting = ref(false)
const submitError = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const isPhoneValid = computed(() => phone.value.replace(/\D/g, '').length >= 8)
const isAmountValid = computed(() => !!amount.value && amount.value >= MIN_AMOUNT)

function stopPolling() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}
onUnmounted(stopPolling)

function pollRecharge(rechargeId: string) {
  stopPolling()
  pollTimer = setInterval(async () => {
    const { recharge } = await $fetch<{ recharge: Recharge }>(`/api/wallet/recharge/${rechargeId}`)
    if (recharge.status === 'confirmed') {
      stopPolling()
      step.value = 'success'
      emit('confirmed')
    } else if (recharge.status === 'failed') {
      stopPolling()
      step.value = 'idle'
      submitError.value = 'La recharge a échoué. Réessayez.'
    }
  }, POLL_INTERVAL_MS)
}

function selectProvider(p: Provider) {
  provider.value = p
}

function reset() {
  step.value = 'idle'
  phone.value = ''
  amount.value = null
}

async function submitRecharge() {
  if (!isPhoneValid.value || !isAmountValid.value || isSubmitting.value) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    const { recharge } = await $fetch<{ recharge: Recharge }>('/api/wallet/recharge', {
      method: 'POST',
      body: { provider: provider.value, phone: phone.value, amount: amount.value },
    })
    step.value = 'processing'
    pollRecharge(recharge.id)
  } catch {
    submitError.value = "La recharge n'a pas pu être initiée. Réessayez."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-5">
    <template v-if="step === 'idle'">
      <p class="mb-3 text-[14.5px] font-bold text-dark">Recharger mon solde</p>

      <div class="mb-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="press flex flex-col items-center gap-2 rounded-field border-2 py-4"
          :class="provider === 'flooz' ? 'border-primary bg-primary/10' : 'border-hairline bg-white'"
          @click="selectProvider('flooz')"
        >
          <span class="h-8 w-8 rounded-[10px]" style="background: #ff6600" />
          <span class="text-[14.5px] font-semibold text-dark">Flooz</span>
        </button>
        <button
          type="button"
          class="press flex flex-col items-center gap-2 rounded-field border-2 py-4"
          :class="provider === 'tmoney' ? 'border-primary bg-primary/10' : 'border-hairline bg-white'"
          @click="selectProvider('tmoney')"
        >
          <span class="h-8 w-8 rounded-[10px]" style="background: #ffc400" />
          <span class="text-[14.5px] font-semibold text-dark">T-Money</span>
        </button>
      </div>

      <label for="recharge-amount" class="mb-1.5 block text-[13px] font-semibold text-dark">Montant (F CFA)</label>
      <input
        id="recharge-amount"
        v-model.number="amount"
        type="number"
        :min="MIN_AMOUNT"
        step="100"
        placeholder="5000"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >

      <label for="recharge-phone" class="mb-1.5 block text-[13px] font-semibold text-dark">Numéro Mobile Money</label>
      <div class="mb-1.5 flex gap-2">
        <div class="flex h-[46px] w-16 shrink-0 items-center justify-center rounded-field border-[1.5px] border-hairline bg-bg text-[14.5px] font-semibold text-dark">
          +228
        </div>
        <input
          id="recharge-phone"
          v-model="phone"
          type="tel"
          inputmode="numeric"
          placeholder="90 12 34 56"
          aria-label="Numéro Mobile Money"
          class="h-[46px] min-w-0 flex-1 rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>

      <p v-if="submitError" class="my-1 text-[12.5px] text-error">{{ submitError }}</p>

      <button
        type="button"
        class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="!isPhoneValid || !isAmountValid || isSubmitting"
        @click="submitRecharge"
      >
        Recharger
      </button>
    </template>

    <div v-else-if="step === 'processing'" class="py-6 text-center">
      <div
        class="mx-auto mb-4 h-10 w-10 animate-[wt-spin_0.8s_linear_infinite] rounded-full border-[3px] border-primary/20 border-t-primary"
      />
      <h2 class="mb-1.5 text-base font-bold text-dark">Confirmation en cours…</h2>
      <p class="text-[13.5px] text-muted">Validez la demande envoyée sur votre téléphone.</p>
    </div>

    <div v-else class="py-6 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary">
        ✓
      </div>
      <h2 class="mb-1.5 text-base font-bold text-dark">Recharge confirmée</h2>
      <p class="mb-5 text-[13.5px] text-muted">Votre solde a été mis à jour.</p>
      <button
        type="button"
        class="press w-full rounded-field border border-hairline py-3 text-[13.5px] font-semibold text-dark hover:border-primary"
        @click="reset"
      >
        Nouvelle recharge
      </button>
    </div>
  </div>
</template>
