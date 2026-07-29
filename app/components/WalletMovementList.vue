<script setup lang="ts">
import type { WalletMovement, WalletMovementType } from '~~/server/utils/walletStore'

/**
 * Historique des mouvements du portefeuille (#190, epic #191), filtrable
 * par type et par période — reflète la traçabilité posée par #192.
 */
const props = defineProps<{ movements: WalletMovement[] }>()

const { t, locale, locales } = useI18n({ useScope: 'global' })

const TYPE_LABELS = computed<Record<WalletMovementType, string>>(() => ({
  recharge: t('walletMovementList.typeRecharge'),
  escrow_debit: t('walletMovementList.typeEscrowDebit'),
  escrow_release: t('walletMovementList.typeEscrowRelease'),
  escrow_refund: t('walletMovementList.typeEscrowRefund'),
  commission: t('walletMovementList.typeCommission'),
  retrait: t('walletMovementList.typeRetrait'),
  cancellation_compensation: t('walletMovementList.typeCancellationCompensation'),
  dispute_penalty: t('walletMovementList.typeDisputePenalty'),
  dispute_compensation: t('walletMovementList.typeDisputeCompensation'),
}))

const typeFilter = ref<'all' | WalletMovementType>('all')
const periodFilter = ref<'all' | '7d' | '30d'>('all')

const PERIOD_MS: Record<'7d' | '30d', number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

const filteredMovements = computed(() => {
  return props.movements.filter((movement) => {
    if (typeFilter.value !== 'all' && movement.type !== typeFilter.value) return false
    if (periodFilter.value !== 'all' && Date.now() - movement.createdAt > PERIOD_MS[periodFilter.value]) return false
    return true
  })
})

function isCredit(type: WalletMovementType): boolean {
  return type !== 'escrow_debit' && type !== 'retrait'
}

// Reçu PDF (#363) : uniquement pour les débits/libérations de séquestre,
// seuls mouvements que l'issue demande de pouvoir justifier par un document.
function hasReceipt(type: WalletMovementType): boolean {
  return type === 'escrow_debit' || type === 'escrow_release'
}

function receiptUrl(movementId: string): string {
  return `/api/wallet/movements/${movementId}/receipt?locale=${locale.value}`
}

const languageTag = computed(() =>
  (locales.value as Array<{ code: string, language?: string }>).find((l) => l.code === locale.value)?.language ?? 'fr-FR',
)

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(languageTag.value, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-[14.5px] font-bold text-dark">{{ t('walletMovementList.heading') }}</p>
      <div class="flex flex-wrap gap-2">
        <select
          v-model="typeFilter"
          :aria-label="t('walletMovementList.typeFilterAria')"
          class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark"
        >
          <option value="all">{{ t('walletMovementList.allTypes') }}</option>
          <option v-for="(label, type) in TYPE_LABELS" :key="type" :value="type">{{ label }}</option>
        </select>
        <select
          v-model="periodFilter"
          :aria-label="t('walletMovementList.periodFilterAria')"
          class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark"
        >
          <option value="all">{{ t('walletMovementList.allPeriods') }}</option>
          <option value="7d">{{ t('walletMovementList.last7Days') }}</option>
          <option value="30d">{{ t('walletMovementList.last30Days') }}</option>
        </select>
      </div>
    </div>

    <p v-if="filteredMovements.length === 0" class="text-center text-[13px] text-muted">{{ t('walletMovementList.noMovements') }}</p>

    <ul v-else class="space-y-2">
      <li
        v-for="movement in filteredMovements"
        :key="movement.id"
        class="flex items-center justify-between gap-3 rounded-field border border-hairline px-3.5 py-2.5"
      >
        <div class="min-w-0">
          <p class="truncate text-[13px] font-semibold text-dark">{{ TYPE_LABELS[movement.type] }}</p>
          <p class="text-[11.5px] text-muted">{{ formatDate(movement.createdAt) }} · {{ t('walletMovementList.referencePrefix') }} {{ movement.reference.slice(0, 8) }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2.5">
          <p class="text-[13.5px] font-bold" :class="isCredit(movement.type) ? 'text-dark' : 'text-error'">
            {{ isCredit(movement.type) ? '+' : '−' }}{{ movement.amount.toLocaleString(languageTag) }} F CFA
          </p>
          <a
            v-if="hasReceipt(movement.type)"
            :href="receiptUrl(movement.id)"
            :aria-label="t('walletMovementList.downloadReceiptAria')"
            :title="t('walletMovementList.downloadReceiptAria')"
            class="press rounded-field border border-hairline bg-white p-1.5 text-muted hover:border-primary/40 hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </a>
        </div>
      </li>
    </ul>
  </div>
</template>
