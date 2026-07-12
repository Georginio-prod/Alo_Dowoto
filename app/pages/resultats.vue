<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
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

// Secteur dont dépend la liste de sous-secteurs de la sidebar (#40) : déduit
// du terme recherché (nom de secteur ou de sous-secteur), avec un repli sur
// « Ménage & Maison » (secteur de la maquette) si rien ne correspond.
const activeSectorSlug = computed(() => {
  const term = searchTerm.value.toLowerCase()
  if (term) {
    const bySubSector = SECTORS.find((s) => s.subSectors.some((sub) => sub.name.toLowerCase() === term))
    if (bySubSector) return bySubSector.slug
    const byName = SECTORS.find((s) => s.name.toLowerCase().includes(term))
    if (byName) return byName.slug
  }
  return 'menage'
})
const subSectorOptions = computed(
  () => SECTORS.find((s) => s.slug === activeSectorSlug.value)?.subSectors.map((sub) => sub.name) ?? [],
)

const filterSubSectors = ref<string[]>([])
const filterCity = ref('')
const filterRatingMin = ref<number | null>(null)
const filterPriceMax = ref(6000)

// Le texte libre ne sert qu'à choisir le secteur affiché (ci-dessus) : une
// fois ce secteur résolu, la requête utilise les filtres structurés plutôt
// que de recombiner `q` (qui ne matcherait pas, par ex., les sous-secteurs
// ne contenant pas le terme recherché).
const { data, pending } = await useFetch<SearchResponse>('/api/providers/search', {
  query: computed(() => ({
    secteur: activeSectorSlug.value,
    sous_secteur: filterSubSectors.value.length ? filterSubSectors.value : undefined,
    ville: filterCity.value || undefined,
    note_min: filterRatingMin.value ?? undefined,
    prix_max: filterPriceMax.value,
    pageSize: 24,
  })),
})
const results = computed(() => data.value?.results ?? [])

function resetFilters() {
  filterSubSectors.value = []
  filterCity.value = ''
  filterRatingMin.value = null
  filterPriceMax.value = 6000
}

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

        <div class="flex items-center gap-2">
          <NuxtLink
            :to="{ path: '/demande', query: searchTerm ? { q: searchTerm } : {} }"
            class="press rounded-field bg-dark px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#1a3a28]"
          >
            Publier une demande précise
          </NuxtLink>
          <button
            type="button"
            class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
            @click="restartDemo"
          >
            ↺ Recommencer la démo
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start">
      <aside class="w-full shrink-0 lg:w-[240px]">
        <ResultsFilters
          v-model:sub-sectors="filterSubSectors"
          v-model:city="filterCity"
          v-model:rating-min="filterRatingMin"
          v-model:price-max="filterPriceMax"
          :sub-sector-options="subSectorOptions"
        />
      </aside>

      <section class="min-w-0 flex-1">
        <ResultsSkeleton v-if="pending" />
        <ResultsEmptyState v-else-if="results.length === 0" @action="resetFilters" />
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
          <ProviderCard v-for="provider in results" :key="provider.id" :provider="provider" />
        </div>
      </section>
    </div>
  </div>
</template>
