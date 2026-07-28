<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { SectorCount } from '~~/server/api/sectors/counts.get'

const { t } = useI18n({ useScope: 'global' })

useHead(() => ({ title: t('categories.pageTitle') }))

const { data: counts, pending } = await useFetch<SectorCount[]>('/api/sectors/counts')

const countBySlug = computed(() => {
  const map = new Map<string, number>()
  for (const entry of counts.value ?? []) map.set(entry.slug, entry.count)
  return map
})

function providerCountLabel(slug: string) {
  const count = countBySlug.value.get(slug) ?? 0
  return t('categories.providerCount', count)
}
</script>

<template>
  <div>
    <section class="mx-auto max-w-6xl px-6 pb-16 pt-10">
      <h1 class="mb-1.5 text-2xl font-extrabold text-dark">{{ t('categories.heading') }}</h1>
      <p class="mb-8 text-[14.5px] text-muted">
        {{ t('categories.intro', { count: SECTORS.length }) }}
      </p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
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
