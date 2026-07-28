<script setup lang="ts">
import type { PayoutMethod, ProviderProfile } from '~~/server/utils/providerStore'

/**
 * « Solde » prestataire (#hub-profil-prestataire) : solde disponible, moyen
 * de retrait (réutilise `payoutMethod` déjà collecté à l'inscription, voir
 * server/utils/providerStore.ts), retrait minimum et historique des
 * mouvements — même bloc `WalletMovementList` que le panneau générique
 * /solde.vue (chercheur), sur le layout dashboard-prestataire.
 */
definePageMeta({ layout: 'dashboard-prestataire', middleware: 'auth', authRole: 'prestataire' })

const { t, locale, locales } = useI18n({ useScope: 'global' })

/** Flooz/T-Money sont des marques (jamais traduites) ; seul le virement bancaire porte un libellé traduisible. */
const PAYOUT_OPTIONS = computed<{ value: PayoutMethod; label: string; color: string }[]>(() => [
  { value: 'flooz', label: 'Flooz', color: '#ff6600' },
  { value: 'tmoney', label: 'T-Money', color: '#ffc400' },
  { value: 'virement', label: t('prestataireSolde.bankTransfer'), color: '#0F2318' },
])

const { balance, movements, minWithdrawal, ensure: ensureWallet, refresh: refreshWallet } = useWallet()
await ensureWallet()

const { data: profileData, refresh: refreshProfile } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const payoutMethod = ref<PayoutMethod | null>(profileData.value?.profile?.payoutMethod ?? null)

const languageTag = computed(() =>
  (locales.value as Array<{ code: string, language?: string }>).find((l) => l.code === locale.value)?.language ?? 'fr-FR',
)
const formattedBalance = computed(() => (balance.value === null ? '…' : `${balance.value.toLocaleString(languageTag.value)} F CFA`))
const formattedMinWithdrawal = computed(() => (minWithdrawal.value === null ? '…' : `${minWithdrawal.value.toLocaleString(languageTag.value)} F CFA`))

const payoutError = ref('')
const payoutSuccess = ref(false)
const isSavingPayout = ref(false)

async function savePayoutMethod() {
  if (!payoutMethod.value || isSavingPayout.value) return
  payoutError.value = ''
  payoutSuccess.value = false
  isSavingPayout.value = true
  try {
    await $fetch('/api/providers/me', { method: 'PATCH', body: { payoutMethod: payoutMethod.value } })
    await refreshProfile()
    payoutSuccess.value = true
  } catch (fetchError) {
    payoutError.value = apiErrorMessage(fetchError, t('prestataireSolde.errorSaveFailed'))
  } finally {
    isSavingPayout.value = false
  }
}

const withdrawAmount = ref<number | null>(null)
const withdrawError = ref('')
const withdrawSuccess = ref(false)
const isWithdrawing = ref(false)

const canWithdraw = computed(() => {
  if (!payoutMethod.value) return false
  if (minWithdrawal.value === null || balance.value === null) return false
  return balance.value >= minWithdrawal.value
})

async function submitWithdrawal() {
  if (isWithdrawing.value || !withdrawAmount.value) return
  withdrawError.value = ''
  withdrawSuccess.value = false
  isWithdrawing.value = true
  try {
    await $fetch('/api/wallet/withdraw', { method: 'POST', body: { amount: withdrawAmount.value } })
    withdrawAmount.value = null
    withdrawSuccess.value = true
    await refreshWallet()
  } catch (fetchError) {
    withdrawError.value = apiErrorMessage(fetchError, t('prestataireSolde.errorWithdrawFailed'))
  } finally {
    isWithdrawing.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardShared.providerSpaceLabel') }}</p>
      <h1 class="text-[21px] font-extrabold text-dark">{{ t('prestataireSolde.heading') }}</h1>
      <p class="mt-1 text-[13px] text-muted">{{ t('prestataireSolde.subtitle') }}</p>
    </div>

    <div class="mb-5 rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
      <p class="text-[13px] text-muted">{{ t('prestataireSolde.availableBalance') }}</p>
      <p class="text-[28px] font-extrabold text-dark">{{ formattedBalance }}</p>
    </div>

    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
        <h2 class="mb-3 text-[14.5px] font-bold text-dark">{{ t('prestataireSolde.payoutMethodHeading') }}</h2>
        <div class="mb-3.5 grid grid-cols-3 gap-2">
          <button
            v-for="option in PAYOUT_OPTIONS"
            :key="option.value"
            type="button"
            class="press flex flex-col items-center gap-1.5 rounded-field border-2 py-3"
            :class="payoutMethod === option.value ? 'border-primary bg-primary/10' : 'border-hairline bg-white'"
            :aria-pressed="payoutMethod === option.value"
            @click="payoutMethod = option.value"
          >
            <span class="h-5 w-5 rounded-[7px]" :style="{ background: option.color }" />
            <span class="text-center text-[11.5px] font-semibold text-dark">{{ option.label }}</span>
          </button>
        </div>

        <p v-if="payoutSuccess" class="mb-2 text-[12.5px] font-semibold text-primary">{{ t('prestataireSolde.payoutSuccess') }}</p>
        <p v-if="payoutError" class="mb-2 text-[12.5px] text-error">{{ payoutError }}</p>

        <button
          type="button"
          class="press w-full rounded-field bg-primary py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="!payoutMethod || isSavingPayout"
          @click="savePayoutMethod"
        >
          {{ isSavingPayout ? t('prestataireSolde.saving') : t('prestataireSolde.save') }}
        </button>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
        <h2 class="mb-1 text-[14.5px] font-bold text-dark">{{ t('prestataireSolde.withdrawHeading') }}</h2>
        <p class="mb-3.5 text-[12px] text-muted">{{ t('prestataireSolde.minWithdrawalText', { amount: formattedMinWithdrawal }) }}</p>

        <label for="withdraw-amount" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('prestataireSolde.amountLabel') }}</label>
        <input
          id="withdraw-amount"
          v-model.number="withdrawAmount"
          type="number"
          :min="minWithdrawal ?? 0"
          :placeholder="t('prestataireSolde.amountPlaceholder')"
          class="mb-3.5 h-[44px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14px] text-ink outline-none focus:border-primary"
        >

        <p v-if="!payoutMethod" class="mb-2 text-[12px] text-muted">{{ t('prestataireSolde.selectPayoutFirst') }}</p>
        <p v-if="withdrawSuccess" class="mb-2 text-[12.5px] font-semibold text-primary">{{ t('prestataireSolde.withdrawSuccess') }}</p>
        <p v-if="withdrawError" class="mb-2 text-[12.5px] text-error">{{ withdrawError }}</p>

        <button
          type="button"
          class="press w-full rounded-field border border-hairline bg-white py-2.5 text-[13.5px] font-semibold text-dark hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="!canWithdraw || !withdrawAmount || isWithdrawing"
          @click="submitWithdrawal"
        >
          {{ isWithdrawing ? t('prestataireSolde.withdrawing') : t('prestataireSolde.withdrawCta') }}
        </button>
      </div>
    </div>

    <WalletMovementList :movements="movements" />
  </div>
</template>
