<script setup lang="ts">
import { SECTORS, type Sector } from '~/data/sectors'

const emit = defineEmits<{
  select: [sector: Sector]
}>()
</script>

<template>
  <section class="mx-auto max-w-6xl px-6 pb-16 pt-8">
    <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 v-reveal class="text-lg font-bold text-dark">Parcourir par secteur</h2>
      <NuxtLink to="/categories" class="press text-[13.5px] font-semibold text-primary hover:underline">
        Toutes les catégories →
      </NuxtLink>
    </div>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      <button
        v-for="(sector, i) in SECTORS"
        :key="sector.slug"
        v-reveal
        type="button"
        :style="{ '--reveal-delay': `${i * 50}ms` }"
        class="press group flex flex-col items-start gap-3 rounded-2xl border border-hairline bg-surface p-4 text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/40 hover:shadow-card-md"
        @click="emit('select', sector)"
      >
        <div
          class="flex h-11 w-11 items-center justify-center rounded-[12px] text-lg transition-transform duration-200 ease-out group-hover:scale-110"
          :style="{ background: sector.color, color: sector.ink }"
        >
          {{ sector.emoji }}
        </div>
        <div class="flex w-full items-start justify-between gap-2">
          <div>
            <div class="text-[14.5px] font-semibold leading-tight text-dark">{{ sector.name }}</div>
            <span class="mt-1 inline-block rounded-pill bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">
              {{ sector.subSectors.length }} sous-secteurs
            </span>
          </div>
          <span class="translate-x-0 text-sm font-bold text-primary opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:opacity-100">
            →
          </span>
        </div>
      </button>
    </div>
  </section>
</template>
