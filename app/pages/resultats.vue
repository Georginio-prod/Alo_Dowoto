<script setup lang="ts">
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

interface SearchResponse {
  results: ProviderSearchResult[]
  total: number
  page: number
  pageSize: number
}

definePageMeta({ layout: 'blank' })

const route = useRoute()

const searchTerm = computed(() => {
  const q = route.query.q
  return typeof q === 'string' ? q.trim() : ''
})

const { data, pending } = await useFetch<SearchResponse>('/api/providers/search', {
  query: computed(() => ({ q: searchTerm.value || undefined, pageSize: 24 })),
})
const results = computed(() => data.value?.results ?? [])

function restartDemo() {
  navigateTo('/')
}
</script>

<template>
  <div>
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <p class="text-[14.5px] text-muted">
            Résultats pour <strong class="text-dark">{{ searchTerm || 'tous les prestataires' }}</strong>
          </p>
        </div>

        <button
          type="button"
          class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          @click="restartDemo"
        >
          ↺ Recommencer la démo
        </button>
      </div>
    </header>

    <div class="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start">
      <aside class="w-full shrink-0 lg:w-[240px]">
        <div class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
          <p class="text-[13px] font-semibold text-muted">Filtres à venir (#40)</p>
        </div>
      </aside>

      <section class="min-w-0 flex-1">
        <p v-if="pending" class="text-[13px] text-muted">Chargement…</p>
        <p v-else-if="results.length === 0" class="text-[13px] text-muted">Aucun résultat.</p>
        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          <ProviderCard v-for="provider in results" :key="provider.id" :provider="provider" />
        </div>
      </section>
    </div>
  </div>
</template>
