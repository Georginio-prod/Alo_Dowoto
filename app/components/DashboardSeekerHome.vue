<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import { SECTOR_ICONS } from '~/utils/sectorIcons'
import type { ServiceRequest } from '~~/server/utils/requestStore'

/**
 * Corps chercheur du dashboard unifié (`pages/dashboard/index.vue`), aligné
 * sur l'écran 2.1 « Accueil client » de la maquette « WorkTogo — App mobile,
 * de A à Z » : la question et le champ de recherche sont l'entrée principale
 * du parcours, suivis des raccourcis secteurs puis de la reprise en cours.
 *
 * Monté uniquement pour le rôle chercheur : ses appels API n'ont donc pas
 * besoin d'être conditionnés (`immediate`), contrairement à la version qui
 * portait les deux rôles dans un seul fichier.
 */

const { t, locale, locales } = useI18n({ useScope: 'global' })
const { user } = useSession()

const { data: favoritesData } = await useFetch<{ favorites: { providerId: string }[] }>('/api/favorites')
const { data: contactsQuotaData } = await useFetch<{ usage: { count: number; limit: number; month: string } }>('/api/quotas/contacts')
const { data: requestsData } = await useFetch<{ requests: ServiceRequest[] }>('/api/requests')

const myRequests = computed(() => requestsData.value?.requests ?? [])
const favoritesCount = computed(() => favoritesData.value?.favorites.length ?? 0)
const contactsUsageLabel = computed(() => {
  const usage = contactsQuotaData.value?.usage
  if (!usage) return '0 / 3'
  return `${usage.count} / ${usage.limit}`
})

// Raccourcis secteurs de l'accueil : les quatre premiers, la liste complète
// restant derrière « Tout voir ».
const featuredSectors = computed(() => SECTORS.slice(0, 4))

// « Reprendre là où vous étiez » : la demande la plus récente. `/api/requests`
// renvoie déjà la liste triée du plus récent au plus ancien.
const lastRequest = computed(() => myRequests.value[0] ?? null)

const searchQuery = ref('')
async function submitSearch() {
  const term = searchQuery.value.trim()
  await navigateTo(term ? { path: '/resultats', query: { q: term } } : '/categories')
}

function languageTag(): string {
  return (locales.value as Array<{ code: string, language?: string }>)
    .find((l) => l.code === locale.value)?.language ?? 'fr-FR'
}
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(languageTag(), { day: '2-digit', month: 'short' })
}
function sectorLabel(slug?: string) {
  if (!slug) return null
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? slug
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[26px] font-extrabold leading-tight text-dark">
      {{ t('dashboardClient.greeting', { name: user?.firstName || t('dashboardClient.greetingFallback') }) }},
      <span class="text-primary">{{ t('dashboardClient.greetingQuestion') }}</span>
    </h1>

    <form class="mb-6" role="search" @submit.prevent="submitSearch">
      <label data-tour="dash-search" class="flex items-center gap-2.5 rounded-pill border border-hairline bg-surface px-4 py-3 shadow-card-sm focus-within:border-primary">
        <span class="sr-only">{{ t('dashboardClient.searchServiceCta') }}</span>
        <svg class="size-[18px] shrink-0 text-muted" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5" />
          <path d="m12.5 12.5 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          enterkeyhint="search"
          :placeholder="t('dashboardClient.searchPlaceholder')"
          class="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted"
        >
      </label>
    </form>

    <section data-tour="dash-sectors" class="mb-6">
      <div class="mb-3 flex items-baseline justify-between gap-2">
        <h2 class="text-[15px] font-bold text-dark">{{ t('sectorGrid.heading') }}</h2>
        <NuxtLink to="/categories" class="press link-underline text-[12.5px] font-semibold text-primary">
          {{ t('dashboardClient.sectorsSeeAll') }}
        </NuxtLink>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <NuxtLink
          v-for="sector in featuredSectors"
          :key="sector.slug"
          :to="`/categories/${sector.slug}`"
          class="card-hover rounded-card border border-hairline bg-surface p-3.5 shadow-card-sm hover:border-primary/40"
        >
          <span
            class="mb-2.5 flex size-9 items-center justify-center rounded-[10px]"
            :style="{ background: sector.color, color: sector.ink }"
          >
            <component :is="SECTOR_ICONS[sector.icon]" :size="18" :stroke-width="2.1" aria-hidden="true" />
          </span>
          <!-- `min-h` : réserve deux lignes pour le nom, sinon un secteur au
               libellé long décale son sous-titre et brise l'alignement de la
               rangée (même parade que SectorGrid). -->
          <span class="block min-h-[2.4em] text-[13.5px] font-semibold leading-tight text-dark">{{ sector.name }}</span>
          <span class="mt-0.5 block truncate text-[11.5px] text-muted">
            {{ sector.subSectors.slice(0, 2).map((s) => s.name).join(', ') }}
          </span>
        </NuxtLink>
      </div>
    </section>

    <!-- Raccourci vers la dernière demande : retomber sur son parcours en
         cours sans repasser par la liste complète. -->
    <section v-if="lastRequest" class="mb-6">
      <h2 class="mb-3 text-[15px] font-bold text-dark">{{ t('dashboardClient.resumeHeading') }}</h2>
      <NuxtLink
        :to="`/matching/${lastRequest.id}`"
        class="press flex items-center justify-between gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
      >
        <span class="min-w-0">
          <span class="block truncate text-[14px] font-semibold text-dark">{{ lastRequest.title }}</span>
          <span class="block text-[12px] text-muted">
            {{ sectorLabel(lastRequest.sector) || lastRequest.location }} · {{ formatDate(lastRequest.createdAt) }}
          </span>
        </span>
        <span class="shrink-0 rounded-pill bg-star/15 px-2.5 py-1 text-[11.5px] font-bold text-star">
          {{ t('dashboardClient.resumeInProgress') }}
        </span>
      </NuxtLink>
    </section>

    <NuxtLink
      v-if="!user?.verified"
      to="/profil"
      class="press mb-6 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
    >
      <p class="text-[13px] font-semibold text-dark">{{ t('dashboardClient.verifyBanner') }}</p>
      <span class="shrink-0 font-bold text-primary">→</span>
    </NuxtLink>

    <div class="mb-6 grid grid-cols-3 gap-3">
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ myRequests.length }}</div>
        <div class="text-[11.5px] text-muted">{{ t('dashboardClient.requestsSent') }}</div>
      </div>
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ contactsUsageLabel }}</div>
        <div class="text-[11.5px] text-muted">{{ t('dashboardClient.contactsThisMonth') }}</div>
      </div>
      <NuxtLink to="/favoris" class="card-hover rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm hover:border-primary/40">
        <div class="text-[22px] font-extrabold text-dark">{{ favoritesCount }}</div>
        <div class="text-[11.5px] text-muted">{{ t('dashboardClient.favoritesLabel') }}</div>
      </NuxtLink>
    </div>

    <section>
      <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">{{ t('dashboardClient.recentRequestsHeading') }}</h2>
      <div v-if="myRequests.length === 0" class="rounded-card border border-hairline bg-surface p-6 text-center shadow-card-sm">
        <p class="mb-3 text-[13.5px] text-muted">{{ t('dashboardClient.noRequestsYet') }}</p>
        <NuxtLink to="/demande" class="press inline-block rounded-field border border-hairline bg-white px-4 py-2.5 text-[13.5px] font-semibold text-dark hover:border-primary">
          {{ t('dashboardClient.postFirstRequestCta') }}
        </NuxtLink>
      </div>
      <ul v-else class="flex flex-col gap-2">
        <li v-for="request in myRequests" :key="request.id">
          <NuxtLink :to="`/matching/${request.id}`" class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40">
            <div class="min-w-0">
              <p class="truncate text-[14px] font-semibold text-dark">{{ request.title }}</p>
              <p class="text-[12px] text-muted">{{ formatDate(request.createdAt) }}</p>
            </div>
            <span class="shrink-0 font-bold text-primary">→</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
