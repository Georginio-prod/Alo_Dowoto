<script setup lang="ts">
import { findPlan, type PlanSlug } from '~/data/plans'

type Provider = 'flooz' | 'tmoney'
type Step = 'idle' | 'processing' | 'success'

interface Subscription {
  id: string
  plan: PlanSlug
  status: 'en_attente' | 'actif' | 'expire'
}

const subscription = ref<Subscription | null>(null)
const plan = computed(() => (subscription.value ? findPlan(subscription.value.plan) : undefined))

const step = ref<Step>('idle')
const provider = ref<Provider>('flooz')
const phone = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

const isPhoneValid = computed(() => phone.value.replace(/\D/g, '').length >= 8)

onMounted(async () => {
  try {
    const { subscription: sub } = await $fetch<{ subscription: Subscription | null }>('/api/subscriptions/me')
    if (!sub || sub.status !== 'en_attente') {
      navigateTo('/abonnement')
      return
    }
    subscription.value = sub
  } catch {
    navigateTo({ path: '/auth', query: { role: 'prestataire' } })
  }
})

function selectProvider(p: Provider) {
  provider.value = p
}

async function submitPayment() {
  if (!isPhoneValid.value || !subscription.value || isSubmitting.value) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    await $fetch('/api/payments/initiate', {
      method: 'POST',
      body: { subscriptionId: subscription.value.id, provider: provider.value, phone: phone.value },
    })
    // États processing/success, voir #33.
    step.value = 'processing'
  } catch {
    submitError.value = 'Le paiement n\'a pas pu être initié. Réessayez.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[440px] px-5 pb-16 pt-7">
    <FlowSteps
      :steps="['Contact', 'Vérification', 'Secteur', 'Abonnement', 'Paiement']"
      :current-index="4"
    />

    <div v-if="plan" class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
      <template v-if="step === 'idle'">
        <h1 class="mb-1 text-lg font-bold text-dark">Paiement Mobile Money</h1>
        <p class="mb-5 text-[13.5px] text-muted">
          {{ plan.name }} — {{ plan.priceLabel }} à régler aujourd'hui
        </p>

        <div class="mb-5 grid grid-cols-2 gap-3">
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

        <label for="payment-phone" class="mb-1.5 block text-[13px] font-semibold text-dark">
          Numéro Mobile Money
        </label>
        <div class="mb-1.5 flex gap-2">
          <div class="flex h-[46px] w-16 shrink-0 items-center justify-center rounded-field border-[1.5px] border-hairline bg-bg text-[14.5px] font-semibold text-dark">
            +228
          </div>
          <input
            id="payment-phone"
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
          :disabled="!isPhoneValid || isSubmitting"
          @click="submitPayment"
        >
          Payer {{ plan.priceLabel }}
        </button>
        <p class="mt-3.5 text-center text-[13px] text-muted">
          Vous recevrez une demande de confirmation sur votre téléphone.
        </p>
      </template>

      <div v-else class="py-6 text-center text-sm text-muted">
        Écran de confirmation à venir (#33).
      </div>
    </div>
  </div>
</template>
