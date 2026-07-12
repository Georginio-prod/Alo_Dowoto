<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { SectorCount } from '~~/server/api/sectors/counts.get'

useHead({ title: 'Toutes les catégories — WorkTogo' })

const { data: counts, pending } = await useFetch<SectorCount[]>('/api/sectors/counts')

const countBySlug = computed(() => {
  const map = new Map<string, number>()
  for (const entry of counts.value ?? []) map.set(entry.slug, entry.count)
  return map
})

function providerCountLabel(slug: string) {
  const count = countBySlug.value.get(slug) ?? 0
  return `${count} prestataire${count > 1 ? 's' : ''}`
}
</script>

<template>
  <div>
    <section class="mx-auto max-w-6xl px-6 pb-16 pt-10">
      <h1 class="mb-1.5 text-2xl font-extrabold text-dark">Toutes les catégories</h1>
      <p class="mb-8 text-[14.5px] text-muted">
        Parcourez les {{ SECTORS.length }} secteurs de WorkTogo et découvrez les prestataires disponibles près de
        chez vous.
      </p>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        <NuxtLink
          v-for="sector in SECTORS"
          :key="sector.slug"
          :to="`/categories/${sector.slug}`"
          class="lift press flex flex-col items-start gap-3 rounded-card border border-hairline bg-surface p-5 text-left shadow-card-sm"
        >
          <div
            class="flex h-11 w-11 items-center justify-center rounded-[12px] text-lg"
            :style="{ background: sector.color, color: sector.ink }"
          >
            {{ sector.emoji }}
          </div>
          <div class="text-[15px] font-bold leading-tight text-dark">{{ sector.name }}</div>
          <div class="text-[13px] text-muted">
            <span v-if="pending">…</span>
            <span v-else>{{ providerCountLabel(sector.slug) }}</span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
