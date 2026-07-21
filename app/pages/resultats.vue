<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { FeaturedProviderResult, ProviderSearchResult } from '~~/server/utils/providerDirectory'

interface SearchResponse {
  results: ProviderSearchResult[]
  total: number
  page: number
  pageSize: number
}

interface FeaturedResponse {
  results: FeaturedProviderResult[]
}

definePageMeta({ layout: 'blank' })

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
            class="press rounded-field bg-dark px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-dark-hover"
          >
            Publier une demande précise
          </NuxtLink>
          <NuxtLink
            to="/dashboard/client"
            class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          >
            Mon espace
          </NuxtLink>
          <NuxtLink
            to="/messages"
            class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          >
            Mes messages
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

    <div v-if="showHomeSections" class="mx-auto max-w-[1200px] px-5 pt-6">
      <section v-if="featuredProviders.length" class="mb-8">
        <h2 class="mb-3 text-[15px] font-bold text-dark">Meilleurs prestataires</h2>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          <ProviderCard
            v-for="provider in featuredProviders"
            :key="`featured-${provider.id}`"
            :provider="provider"
            :badge="provider.badge"
            :is-favorite="favoriteProviderIds.has(provider.id)"
            @favorite-changed="refreshFavorites"
          />
        </div>
      </section>

      <section v-if="nearbyProviders.length" class="mb-8">
        <h2 class="mb-3 text-[15px] font-bold text-dark">Prestataires près de vous</h2>
        <p class="mb-3 text-[12.5px] text-muted">Basé sur votre localisation : {{ nearbyCity }}</p>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          <ProviderCard
            v-for="provider in nearbyProviders"
            :key="`nearby-${provider.id}`"
            :provider="provider"
            :is-favorite="favoriteProviderIds.has(provider.id)"
            @favorite-changed="refreshFavorites"
          />
        </div>
      </section>
    </div>

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
        <h2 v-if="showHomeSections" class="mb-3 text-[15px] font-bold text-dark">Tous les prestataires</h2>
        <ResultsSkeleton v-if="pending" />
        <ResultsEmptyState v-else-if="results.length === 0" @action="resetFilters" />
        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          <ProviderCard
            v-for="provider in results"
            :key="provider.id"
            :provider="provider"
            :is-favorite="favoriteProviderIds.has(provider.id)"
            @favorite-changed="refreshFavorites"
          />
        </div>
      </section>
    </div>
  </div>
</template>
