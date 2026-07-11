<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
</script>

<template>
  <div>
    <HeroSection />

    <section class="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <h2 v-reveal class="mb-4 text-lg font-bold text-dark">Parcourir par secteur</h2>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
        <button
          v-for="(sector, i) in SECTORS"
          :key="sector.slug"
          v-reveal
          :style="{ '--reveal-delay': `${i * 40}ms` }"
          class="lift flex flex-col items-start gap-2.5 rounded-2xl border border-black/[0.08] bg-white p-4 text-left"
        >
          <div
            class="flex h-9 w-9 items-center justify-center rounded-[10px] text-base"
            :style="{ background: sector.color, color: sector.ink }"
          >
            {{ sector.emoji }}
          </div>
          <div class="text-[14.5px] font-semibold leading-tight text-dark">{{ sector.name }}</div>
          <div class="text-xs text-muted">{{ sector.subSectors.length }} sous-secteurs</div>
        </button>
      </div>
    </section>
  </div>
</template>
