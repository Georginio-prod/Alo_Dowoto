<script setup lang="ts">
import { findPlan, type PlanSlug } from '~/data/plans'

type Provider = 'flooz' | 'tmoney'
type Step = 'idle' | 'processing' | 'success'

interface Subscription {
  id: string
  plan: PlanSlug
  status: 'en_attente' | 'actif' | 'expire'
}

interface Payment {
  id: string
  status: 'pending' | 'confirmed' | 'failed'
}

const POLL_INTERVAL_MS = 1500

const { t } = useI18n({ useScope: 'global' })

const subscription = ref<Subscription | null>(null)
const plan = computed(() => (subscription.value ? findPlan(subscription.value.plan) : undefined))
const planName = computed(() => (plan.value ? t(`plans.${plan.value.slug}.name`) : ''))

const step = ref<Step>('idle')
const provider = ref<Provider>('flooz')
const phone = ref('')
const isSubmitting = ref(false)
const submitError = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const isPhoneValid = computed(() => phone.value.replace(/\D/g, '').length >= 8)

function stopPolling() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

function pollPayment(paymentId: string) {
  stopPolling()
  pollTimer = setInterval(async () => {
    const { payment } = await $fetch<{ payment: Payment }>(`/api/payments/${paymentId}`)
    if (payment.status === 'confirmed') {
      stopPolling()
      step.value = 'success'
    } else if (payment.status === 'failed') {
      stopPolling()
      step.value = 'idle'
      submitError.value = t('paiement.errorPaymentFailed')
    }
  }, POLL_INTERVAL_MS)
}

onUnmounted(stopPolling)

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
    const { payment } = await $fetch<{ payment: Payment }>('/api/payments/initiate', {
      method: 'POST',
      body: { subscriptionId: subscription.value.id, provider: provider.value, phone: phone.value },
    })
    step.value = 'processing'
    pollPayment(payment.id)
  } catch {
    submitError.value = t('paiement.errorInitiateFailed')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[440px] px-5 pb-16 pt-7">
    <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">{{ t('paiement.back') }}</NuxtLink>

    <FlowSteps
      :steps="[t('flowSteps.contact'), t('flowSteps.verification'), t('flowSteps.sector'), t('flowSteps.subscription'), t('flowSteps.payment')]"
      :current-index="4"
    />

    <div v-if="plan" class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
      <template v-if="step === 'idle'">
        <h1 class="mb-1 text-lg font-bold text-dark">{{ t('paiement.heading') }}</h1>
        <p class="mb-5 text-[13.5px] text-muted">
          {{ planName }} — {{ plan.priceLabel }} {{ t('paiement.amountDueSuffix') }}
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
          {{ t('paiement.phoneLabel') }}
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
            :placeholder="t('paiement.phonePlaceholder')"
            :aria-label="t('paiement.phoneLabel')"
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
          {{ t('paiement.payCta', { price: plan.priceLabel }) }}
        </button>
        <p class="mt-3.5 text-center text-[13px] text-muted">
          {{ t('paiement.confirmationNotice') }}
        </p>
      </template>

      <div v-else-if="step === 'processing'" class="py-6 text-center">
        <div
          class="mx-auto mb-4 h-10 w-10 animate-[wt-spin_0.8s_linear_infinite] rounded-full border-[3px] border-primary/20 border-t-primary"
        />
        <h2 class="mb-1.5 text-base font-bold text-dark">{{ t('paiement.processingHeading') }}</h2>
        <p class="text-[13.5px] text-muted">{{ t('paiement.processingText') }}</p>
      </div>

      <div v-else class="py-6 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary">
          ✓
        </div>
        <h2 class="mb-1.5 text-base font-bold text-dark">{{ t('paiement.successHeading') }}</h2>
        <p class="mb-5 text-[13.5px] leading-relaxed text-muted">
          {{ t('paiement.successText', { plan: planName }) }}
        </p>
        <NuxtLink
          to="/dashboard"
          class="press block w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover"
        >
          {{ t('paiement.completeProfileCta') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
