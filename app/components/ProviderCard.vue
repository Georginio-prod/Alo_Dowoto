<script setup lang="ts">
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

const props = defineProps<{
  provider: ProviderSearchResult
}>()

const filledStars = computed(() => Math.round(props.provider.rating))
</script>

<template>
  <div class="flex flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card-sm">
    <div
      class="flex h-[140px] items-center justify-center bg-[repeating-linear-gradient(135deg,#e5e7eb_0_10px,#eef0f2_10px_20px)]"
    >
      <span class="rounded-pill bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">photo</span>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[15px] font-bold text-dark">{{ provider.displayName }}</span>
        <span
          v-if="provider.verified"
          class="rounded-pill bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary"
        >
          ✓ Vérifié
        </span>
      </div>

      <p class="text-[13px] text-muted">{{ provider.subSector }} · {{ provider.city }}</p>

      <p class="text-[13.5px] text-dark">
        <span aria-hidden="true">
          <span v-for="n in 5" :key="n" :class="n <= filledStars ? 'text-star' : 'text-hairline'">★</span>
        </span>
        <span class="ml-1 font-semibold">{{ provider.rating.toFixed(1) }}</span>
        <span class="text-muted"> ({{ provider.reviewCount }} avis)</span>
      </p>

      <p class="text-[14.5px] font-bold text-dark">À partir de {{ provider.priceFrom }} FCFA</p>

      <button
        type="button"
        class="press mt-auto rounded-field bg-dark py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#1a3a28]"
      >
        Voir le profil
      </button>
    </div>
  </div>
</template>
