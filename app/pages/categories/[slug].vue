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

const slug = computed(() => String(route.params.slug ?? ''))
const sector = computed(() => SECTORS.find((s) => s.slug === slug.value) ?? null)

useHead({
  title: computed(() => `${sector.value ? sector.value.name : 'Catégorie introuvable'} — WorkTogo`),
})

// Slug inconnu : on ne sollicite pas l'API de recherche (elle rejetterait de
// toute façon un secteur invalide) et on affiche directement un état clair
// plutôt qu'un plantage.
const { data, pending } = await useAsyncData<SearchResponse>(
  () => `categorie-${slug.value}`,
  async () => {
    if (!sector.value) return { results: [], total: 0, page: 1, pageSize: 0 }
    return $fetch<SearchResponse>('/api/providers/search', {
      query: { secteur: sector.value.slug, pageSize: 48 },
    })
  },
  { watch: [slug] },
)

const results = computed(() => data.value?.results ?? [])
</script>

<template>
  <div>
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-center gap-3">
          <NuxtLink to="/" class="shrink-0 text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <NuxtLink to="/categories" class="text-[13.5px] font-semibold text-muted hover:text-dark">
            ← Toutes les catégories
          </NuxtLink>
        </div>

        <NuxtLink
          v-if="sector"
          :to="{ path: '/demande', query: { q: sector.name } }"
          class="press rounded-field bg-dark px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#1a3a28]"
        >
          Publier une demande
        </NuxtLink>
      </div>
    </header>

    <div class="mx-auto max-w-[1200px] px-5 py-6">
      <template v-if="sector">
        <div class="mb-6 flex items-center gap-3.5">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-xl"
            :style="{ background: sector.color, color: sector.ink }"
          >
            {{ sector.emoji }}
          </div>
          <div>
            <h1 class="text-xl font-extrabold text-dark">{{ sector.name }}</h1>
            <p class="text-[13.5px] text-muted">
              {{ sector.subSectors.map((s) => s.name).join(' · ') }}
            </p>
          </div>
        </div>

        <ResultsSkeleton v-if="pending" />
        <ResultsEmptyState
          v-else-if="results.length === 0"
          title="Aucun prestataire pour l’instant"
          description="Ce secteur ne compte pas encore de prestataire inscrit. Publiez une demande pour être notifié dès qu'un profil correspond."
          action-label="Publier une demande"
          @action="navigateTo({ path: '/demande', query: { q: sector.name } })"
        />
        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          <ProviderCard v-for="provider in results" :key="provider.id" :provider="provider" />
        </div>
      </template>

      <ResultsEmptyState
        v-else
        title="Catégorie introuvable"
        description="Ce secteur n'existe pas. Retrouvez la liste complète des catégories WorkTogo ci-dessous."
        action-label="Voir toutes les catégories"
        @action="navigateTo('/categories')"
      />
    </div>
  </div>
</template>
