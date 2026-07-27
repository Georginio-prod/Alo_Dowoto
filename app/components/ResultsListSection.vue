<script setup lang="ts">
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

/**
 * Zone de résultats de /resultats.vue (compteur, bascule liste/carte, tri,
 * bandeau d'élargissement de rayon, puces de filtres actifs, puis
 * liste/carte/état vide) — extrait de la page pour rester sous la limite de
 * lignes par fichier (#geoloc ajoute la bascule carte et le bandeau de
 * proximité à une page déjà volumineuse), sur le même principe que
 * MessageThread.vue/MessageComposer.vue.
 */
interface FilterChip {
  id: string
  label: string
  clear: () => void
}

const props = defineProps<{
  results: ProviderSearchResult[]
  pending: boolean
  totalResults: number
  proximity: { requestedRadiusKm: number; usedRadiusKm: number; widened: boolean } | null
  activeFilters: FilterChip[]
  showHomeSections: boolean
  searcherPosition: { latitude: number; longitude: number } | null
  searchRadiusKm: number
  favoriteProviderIds: Set<string>
}>()

const emit = defineEmits<{ 'reset-filters': []; 'favorite-changed': []; 'select-provider': [id: string] }>()

type ViewMode = 'liste' | 'carte'
const viewMode = defineModel<ViewMode>('viewMode', { required: true })
type SortOption = 'pertinence' | 'note' | 'prix_asc' | 'prix_desc'
const sortBy = defineModel<SortOption>('sortBy', { required: true })

const mapRadiusKm = computed(() => (props.searcherPosition ? props.searchRadiusKm : null))
</script>

<template>
  <section class="min-w-0 flex-1">
    <!-- Barre d'outils résultats : compteur (réassurance), bascule liste/carte, tri explicite. -->
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-[15px] font-bold text-dark">
        {{ showHomeSections ? 'Tous les prestataires' : 'Résultats' }}
        <span v-if="!pending" class="ml-1 text-[13px] font-medium text-muted">({{ totalResults }})</span>
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex rounded-field border border-hairline bg-white p-0.5" role="group" aria-label="Mode d'affichage">
          <button
            type="button"
            class="press rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold"
            :class="viewMode === 'liste' ? 'bg-primary text-white' : 'text-muted'"
            :aria-pressed="viewMode === 'liste'"
            @click="viewMode = 'liste'"
          >
            ☰ Liste
          </button>
          <button
            type="button"
            class="press rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold"
            :class="viewMode === 'carte' ? 'bg-primary text-white' : 'text-muted'"
            :aria-pressed="viewMode === 'carte'"
            @click="viewMode = 'carte'"
          >
            🗺️ Carte
          </button>
        </div>
        <label class="flex items-center gap-2 text-[12.5px] text-muted">
          Trier par
          <select
            v-model="sortBy"
            class="h-[38px] rounded-field border border-hairline bg-white px-2.5 text-[13px] font-semibold text-dark outline-none focus:border-primary"
            aria-label="Trier les résultats"
          >
            <option value="pertinence">Pertinence</option>
            <option value="note">Mieux notés</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Élargissement automatique du rayon (#geoloc, 1.3) : jamais de page
         vide sans explication — voir searchProvidersNearby. -->
    <p
      v-if="proximity?.widened"
      class="mb-4 rounded-field border border-primary/30 bg-primary/8 px-3.5 py-2.5 text-[12.5px] text-dark"
    >
      Aucun prestataire dans un rayon de {{ proximity.requestedRadiusKm }} km. Voici les plus proches, jusqu'à {{ proximity.usedRadiusKm }} km.
    </p>

    <!-- Filtres actifs retirables (récapitulatif clair de la recherche). -->
    <div v-if="activeFilters.length" class="mb-4 flex flex-wrap items-center gap-2">
      <span class="text-[12px] font-semibold text-muted">Filtres actifs :</span>
      <button
        v-for="chip in activeFilters"
        :key="chip.id"
        type="button"
        class="press inline-flex items-center gap-1.5 rounded-pill border border-primary/30 bg-primary/10 px-3 py-1 text-[12.5px] font-semibold text-primary hover:border-primary/50"
        @click="chip.clear()"
      >
        {{ chip.label }}
        <span aria-hidden="true">×</span>
        <span class="sr-only">Retirer le filtre {{ chip.label }}</span>
      </button>
      <button type="button" class="press text-[12.5px] font-semibold text-muted underline hover:text-dark" @click="emit('reset-filters')">
        Tout effacer
      </button>
    </div>

    <ResultsSkeleton v-if="pending" />
    <ResultsEmptyState v-else-if="results.length === 0" @action="emit('reset-filters')" />
    <ProviderMap
      v-else-if="viewMode === 'carte'"
      :providers="results"
      :searcher-position="searcherPosition"
      :radius-km="mapRadiusKm"
      @select-provider="emit('select-provider', $event)"
    />
    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      <ProviderCard
        v-for="(provider, i) in results"
        :key="provider.id"
        :provider="provider"
        :is-favorite="favoriteProviderIds.has(provider.id)"
        :reveal-delay="Math.min(i, 10) * 45"
        @favorite-changed="emit('favorite-changed')"
      />
    </div>
  </section>
</template>
