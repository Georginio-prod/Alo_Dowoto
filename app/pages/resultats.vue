<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import { DEFAULT_RADIUS_KM } from '~/data/searchRadius'
import type { FeaturedProviderResult, ProviderSearchResult } from '~~/server/utils/providerDirectory'

interface SearchResponse {
  results: ProviderSearchResult[]
  total: number
  page: number
  pageSize: number
  proximity: { requestedRadiusKm: number; usedRadiusKm: number; widened: boolean } | null
}

interface FeaturedResponse {
  results: FeaturedProviderResult[]
}

definePageMeta({ layout: 'blank' })

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const { user, ensure } = useSession()
await ensure()

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

const PRICE_MAX_DEFAULT = 6000

const filterSubSectors = ref<string[]>([])
const filterCity = ref('')
const filterRatingMin = ref<number | null>(null)
const filterPriceMax = ref(PRICE_MAX_DEFAULT)

// Tri explicite de la barre de résultats (inspiré Upwork/Malt/Fiverr).
// « Pertinence » = ordre par défaut du serveur (proximité si géoloc, sinon
// score multi-critères) : on n'envoie alors aucun paramètre `tri`, le
// comportement historique est strictement préservé.
type SortOption = 'pertinence' | 'note' | 'prix_asc' | 'prix_desc'
const sortBy = ref<SortOption>('pertinence')

// Position et rayon de recherche (#geoloc, 1.1/1.3) : possédés par
// LocationRadiusPicker.vue (géolocalisation + repli quartier), cette page ne
// fait que les transmettre à la requête, comme les autres filtres ci-dessus.
type ViewMode = 'liste' | 'carte'
const viewMode = ref<ViewMode>('liste')
const searchLatitude = ref<number>()
const searchLongitude = ref<number>()
const searchQuartier = ref('')
const searchRadiusKm = ref(DEFAULT_RADIUS_KM)
const selectedMapProviderId = ref<string | null>(null)

const searcherPosition = computed(() =>
  searchLatitude.value !== undefined && searchLongitude.value !== undefined
    ? { latitude: searchLatitude.value, longitude: searchLongitude.value }
    : null,
)

// Le texte libre ne sert qu'à choisir le secteur affiché (ci-dessus) : une
// fois ce secteur résolu, la requête utilise les filtres structurés plutôt
// que de recombiner `q` (qui ne matcherait pas, par ex., les sous-secteurs
// ne contenant pas le terme recherché).
const { data, pending } = await useFetch<SearchResponse>('/api/providers/search', {
  query: computed(() => ({
    secteur: activeSectorSlug.value,
    sous_secteur: filterSubSectors.value.length ? filterSubSectors.value : undefined,
    ville: filterCity.value || undefined,
    quartier: searchQuartier.value || undefined,
    note_min: filterRatingMin.value ?? undefined,
    prix_max: filterPriceMax.value,
    tri: sortBy.value === 'pertinence' ? undefined : sortBy.value,
    lat: searchLatitude.value,
    lng: searchLongitude.value,
    rayon_km: searcherPosition.value ? searchRadiusKm.value : undefined,
    pageSize: 24,
  })),
})
const results = computed(() => data.value?.results ?? [])
const totalResults = computed(() => data.value?.total ?? 0)
const proximity = computed(() => data.value?.proximity ?? null)

// Puces de filtres actifs (pattern Malt/Upwork) : récapitulent en un coup
// d'œil ce qui restreint la recherche et se retirent d'un clic. Chaque puce
// porte sa propre fonction de retrait, ciblant le v-model concerné.
interface FilterChip {
  id: string
  label: string
  clear: () => void
}
const activeFilters = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = []
  for (const sub of filterSubSectors.value) {
    chips.push({ id: `sub-${sub}`, label: sub, clear: () => { filterSubSectors.value = filterSubSectors.value.filter((s) => s !== sub) } })
  }
  if (filterCity.value) {
    chips.push({ id: 'city', label: filterCity.value, clear: () => { filterCity.value = '' } })
  }
  if (filterRatingMin.value !== null) {
    chips.push({ id: 'rating', label: t('resultats.ratingAndAbove', { rating: filterRatingMin.value }), clear: () => { filterRatingMin.value = null } })
  }
  if (filterPriceMax.value < PRICE_MAX_DEFAULT) {
    chips.push({ id: 'price', label: t('resultats.maxPrice', { price: filterPriceMax.value }), clear: () => { filterPriceMax.value = PRICE_MAX_DEFAULT } })
  }
  return chips
})

// Sections « accueil » (#187) : uniquement pertinentes en navigation libre
// (aucun terme recherché) — une recherche précise (q) bascule la page en
// vue résultats focalisée, où mettre en avant d'autres profils que ceux
// recherchés n'aurait pas de sens.
const showHomeSections = computed(() => !searchTerm.value)

// « Meilleurs prestataires » (#187) : classement calculé dynamiquement côté
// serveur (score de mise en avant, moyenne bayésienne des avis) plutôt que
// figé en dur — voir server/api/providers/featured.get.ts.
const { data: featuredData } = await useFetch<FeaturedResponse>('/api/providers/featured', {
  query: { limit: 6 },
})
const featuredProviders = computed(() => featuredData.value?.results ?? [])

// « Prestataires près de vous » (#187/#263) : distance réelle (Haversine,
// server/utils/geo.ts) quand le chercheur connecté a des coordonnées GPS
// (bouton « Ma position » à l'inscription, userStore.latitude/longitude) —
// repli sur le filtrage par ville (comportement d'origine) sinon, sans
// régression pour les comptes n'ayant jamais activé la géolocalisation.
const nearbyCity = computed(() => user.value?.location || '')
const nearbyHasCoords = computed(() => user.value?.latitude !== undefined && user.value?.longitude !== undefined)
const { data: nearbyData } = await useFetch<SearchResponse>('/api/providers/search', {
  query: computed(() => ({
    ville: nearbyHasCoords.value ? undefined : (nearbyCity.value || undefined),
    lat: user.value?.latitude,
    lng: user.value?.longitude,
    pageSize: 6,
  })),
})
const nearbyProviders = computed(() =>
  nearbyHasCoords.value || nearbyCity.value ? (nearbyData.value?.results ?? []) : [],
)

// Favoris déjà enregistrés par le client (#64) : chargés une seule fois pour
// tous les prestataires affichés plutôt qu'une requête par carte. Échoue
// silencieusement (client non connecté ou compte prestataire) : les cartes
// démarrent alors simplement non favorites.
const { data: favoritesData, refresh: refreshFavorites } = await useFetch<{ favorites: { providerId: string }[] }>(
  '/api/favorites',
)
const favoriteProviderIds = computed(() => new Set((favoritesData.value?.favorites ?? []).map((f) => f.providerId)))

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
    <header class="sticky top-0 z-20 border-b border-hairline bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <p class="text-[14.5px] text-muted">
            {{ t('resultats.resultsForPrefix') }} <strong class="text-dark">{{ searchTerm || t('resultats.allProviders') }}</strong>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink
            :to="{ path: '/demande', query: searchTerm ? { q: searchTerm } : {} }"
            class="press rounded-field bg-dark px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-dark-hover"
          >
            {{ t('resultats.postRequestCta') }}
          </NuxtLink>
          <NuxtLink
            to="/dashboard/client"
            class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          >
            {{ t('resultats.mySpaceCta') }}
          </NuxtLink>
          <NuxtLink
            to="/messages"
            class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          >
            {{ t('resultats.myMessagesCta') }}
          </NuxtLink>
          <button
            type="button"
            class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
            @click="restartDemo"
          >
            {{ t('resultats.restartDemo') }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="showHomeSections" class="mx-auto max-w-[1200px] px-5 pt-6">
      <section v-if="featuredProviders.length" class="mb-8">
        <h2 class="mb-3 text-[15px] font-bold text-dark">{{ t('resultats.bestProviders') }}</h2>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          <ProviderCard
            v-for="(provider, i) in featuredProviders"
            :key="`featured-${provider.id}`"
            :provider="provider"
            :badge="provider.badge"
            :is-favorite="favoriteProviderIds.has(provider.id)"
            :reveal-delay="i * 60"
            @favorite-changed="refreshFavorites"
          />
        </div>
      </section>

      <section v-if="nearbyProviders.length" class="mb-8">
        <h2 class="mb-3 text-[15px] font-bold text-dark">{{ t('resultats.nearbyProviders') }}</h2>
        <p class="mb-3 text-[12.5px] text-muted">{{ t('resultats.nearbyBasedOn', { city: nearbyCity }) }}</p>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          <ProviderCard
            v-for="(provider, i) in nearbyProviders"
            :key="`nearby-${provider.id}`"
            :provider="provider"
            :is-favorite="favoriteProviderIds.has(provider.id)"
            :reveal-delay="i * 60"
            @favorite-changed="refreshFavorites"
          />
        </div>
      </section>
    </div>

    <div class="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start">
      <aside class="w-full shrink-0 space-y-4 lg:w-[240px]">
        <LocationRadiusPicker
          v-model:latitude="searchLatitude"
          v-model:longitude="searchLongitude"
          v-model:quartier="searchQuartier"
          v-model:radius-km="searchRadiusKm"
        />
        <ResultsFilters
          v-model:sub-sectors="filterSubSectors"
          v-model:city="filterCity"
          v-model:rating-min="filterRatingMin"
          v-model:price-max="filterPriceMax"
          :sub-sector-options="subSectorOptions"
        />
      </aside>

      <ResultsListSection
        v-model:view-mode="viewMode"
        v-model:sort-by="sortBy"
        :results="results"
        :pending="pending"
        :total-results="totalResults"
        :proximity="proximity"
        :active-filters="activeFilters"
        :show-home-sections="showHomeSections"
        :searcher-position="searcherPosition"
        :search-radius-km="searchRadiusKm"
        :favorite-provider-ids="favoriteProviderIds"
        @reset-filters="resetFilters"
        @favorite-changed="refreshFavorites"
        @select-provider="selectedMapProviderId = $event"
      />
    </div>

    <ProviderProfileModal
      v-if="selectedMapProviderId"
      :provider-id="selectedMapProviderId"
      @close="selectedMapProviderId = null"
    />
  </div>
</template>
