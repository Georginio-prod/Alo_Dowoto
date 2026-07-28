<script setup lang="ts">
/**
 * Puce de solde dans la navbar chercheur (#189, epic #191) : ouvre le
 * panneau détaillé « Mon solde » (#190) au clic. Le solde reste synchronisé
 * avec le compte réel via l'état partagé `useWallet` (voir composable).
 */
const { locale, locales } = useI18n({ useScope: 'global' })
const { balance, ensure } = useWallet()
await ensure()

const formattedBalance = computed(() => {
  if (balance.value === null) return '…'
  const languageTag = (locales.value as Array<{ code: string, language?: string }>)
    .find((l) => l.code === locale.value)?.language ?? 'fr-FR'
  return `${balance.value.toLocaleString(languageTag)} F CFA`
})
</script>

<template>
  <NuxtLink
    to="/solde"
    class="press flex items-center gap-1.5 rounded-pill border border-hairline bg-bg px-3.5 py-2 text-[13.5px] font-semibold text-dark hover:border-primary"
  >
    <svg class="size-4 shrink-0 opacity-70" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="4.5" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.4" />
      <path d="M2 7.5H16" stroke="currentColor" stroke-width="1.4" />
      <circle cx="12.5" cy="11" r="1" fill="currentColor" />
    </svg>
    {{ formattedBalance }}
  </NuxtLink>
</template>
