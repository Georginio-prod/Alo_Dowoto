<script setup lang="ts">
import type { WalletMovement, WalletMovementType } from '~~/server/utils/walletStore'

/**
 * Historique des mouvements du portefeuille (#190, epic #191), filtrable
 * par type et par période — reflète la traçabilité posée par #192.
 */
const props = defineProps<{ movements: WalletMovement[] }>()

const TYPE_LABELS: Record<WalletMovementType, string> = {
  recharge: 'Recharge',
  escrow_debit: 'Paiement en séquestre',
  escrow_release: 'Paiement reçu (séquestre libéré)',
  escrow_refund: 'Remboursement',
  commission: 'Commission WorkTogo',
  retrait: 'Retrait',
  cancellation_compensation: 'Indemnisation (annulation tardive du chercheur)',
}

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

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-[14.5px] font-bold text-dark">Historique des mouvements</p>
      <div class="flex flex-wrap gap-2">
        <select
          v-model="typeFilter"
          aria-label="Filtrer par type de mouvement"
          class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark"
        >
          <option value="all">Tous les types</option>
          <option v-for="(label, type) in TYPE_LABELS" :key="type" :value="type">{{ label }}</option>
        </select>
        <select
          v-model="periodFilter"
          aria-label="Filtrer par période"
          class="h-9 rounded-field border border-hairline bg-white px-2.5 text-[12.5px] text-dark"
        >
          <option value="all">Toute période</option>
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
        </select>
      </div>
    </div>

    <p v-if="filteredMovements.length === 0" class="text-center text-[13px] text-muted">Aucun mouvement.</p>

    <ul v-else class="space-y-2">
      <li
        v-for="movement in filteredMovements"
        :key="movement.id"
        class="flex items-center justify-between gap-3 rounded-field border border-hairline px-3.5 py-2.5"
      >
        <div class="min-w-0">
          <p class="truncate text-[13px] font-semibold text-dark">{{ TYPE_LABELS[movement.type] }}</p>
          <p class="text-[11.5px] text-muted">{{ formatDate(movement.createdAt) }} · Réf. {{ movement.reference.slice(0, 8) }}</p>
        </div>
        <p class="shrink-0 text-[13.5px] font-bold" :class="isCredit(movement.type) ? 'text-dark' : 'text-error'">
          {{ isCredit(movement.type) ? '+' : '−' }}{{ movement.amount.toLocaleString('fr-FR') }} F CFA
        </p>
      </li>
    </ul>
  </div>
</template>
