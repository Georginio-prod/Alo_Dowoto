<script setup lang="ts">
/**
 * Panneau détaillé « Mon solde » (#190, epic #191) : solde, recharge et
 * historique des mouvements du portefeuille WorkTogo — même endroit que la
 * traçabilité du système d'escrow (#192-#197).
 */
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { balance, movements, ensure, refresh } = useWallet()
await ensure()

const formattedBalance = computed(() => (balance.value === null ? '…' : `${balance.value.toLocaleString('fr-FR')} F CFA`))
</script>

<template>
  <div>
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <p class="text-[14.5px] text-muted">Mon solde</p>
        </div>

        <NuxtLink
          to="/dashboard/client"
          class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
        >
          ← Mon espace
        </NuxtLink>
      </div>
    </header>

    <div class="mx-auto max-w-[1100px] px-5 py-6">
      <div class="mb-5 rounded-card border border-hairline bg-surface p-5">
        <p class="text-[13px] text-muted">Solde disponible</p>
        <p class="text-[28px] font-extrabold text-dark">{{ formattedBalance }}</p>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <WalletRechargeForm @confirmed="refresh" />
        <WalletMovementList :movements="movements" />
      </div>
    </div>
  </div>
</template>
