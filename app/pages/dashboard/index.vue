<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { ServiceRequest, ProviderMatchedRequest } from '~~/server/utils/requestStore'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'

/**
 * Dashboard unifié « Mon espace » (cible mobile / APK, voir mobile/).
 *
 * Fusionne en UNE seule vue role-aware les deux tableaux de bord jusqu'ici
 * séparés — chercheur (app/pages/dashboard/client.vue, layout `blank`) et
 * prestataire (app/pages/prestataire/index.vue, layout `dashboard-prestataire`
 * à barre latérale). L'utilisateur connecté ne voit donc qu'un seul écran
 * cohérent et scrollable adapté à son rôle, plus une navigation rapide vers
 * les sous-pages, sans dupliquer l'information.
 *
 * Ne modifie ni ne remplace les pages existantes : c'est une nouvelle route
 * (/dashboard) qui réutilise exactement les mêmes API et clés i18n. Les
 * endpoints propres au prestataire ne sont appelés que pour ce rôle
 * (`immediate`), afin qu'un compte chercheur ne déclenche pas d'appels qui
 * exigent le rôle prestataire.
 */

definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t, locale, locales } = useI18n({ useScope: 'global' })
const { user } = useSession()

// Rôle connu dès le setup : le middleware `auth` a déjà résolu la session
// (refresh) avant le rendu de la page.
const isProvider = user.value?.role === 'prestataire'

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

/* --------------------------------- Chercheur -------------------------------- */
const { data: favoritesData } = await useFetch<{ favorites: { providerId: string }[] }>(
  '/api/favorites',
  { immediate: !isProvider },
)
const { data: contactsQuotaData } = await useFetch<{ usage: { count: number; limit: number; month: string } }>(
  '/api/quotas/contacts',
  { immediate: !isProvider },
)
const { data: requestsData } = await useFetch<{ requests: ServiceRequest[] }>(
  '/api/requests',
  { immediate: !isProvider },
)
const myRequests = computed(() => requestsData.value?.requests ?? [])
const favoritesCount = computed(() => favoritesData.value?.favorites.length ?? 0)
const contactsUsageLabel = computed(() => {
  const usage = contactsQuotaData.value?.usage
  if (!usage) return '0 / 3'
  return `${usage.count} / ${usage.limit}`
})

/* -------------------------------- Prestataire ------------------------------- */
const BADGE_STYLES: Record<string, string> = {
  none: 'bg-white/10 text-white/80',
  pending: 'bg-primary/20 text-primary',
  active: 'bg-primary text-white',
  expired: 'bg-error/20 text-error',
}

const { data: profileData } = await useFetch<{ profile: ProviderProfile | null }>(
  '/api/providers/me',
  { immediate: isProvider },
)
const { data: subscriptionData } = await useFetch<{ subscription: Subscription | null }>(
  '/api/subscriptions/me',
  { immediate: isProvider },
)
const { data: requestsQuotaData } = await useFetch<{ usage: { count: number; limit: number | null; month: string } }>(
  '/api/quotas/requests-received',
  { immediate: isProvider },
)
const { data: ratingData } = await useFetch<{ rating: { average: number; count: number } }>(
  '/api/reviews/me',
  { immediate: isProvider },
)
const { data: matchesData } = await useFetch<{ matches: ProviderMatchedRequest[] }>(
  '/api/requests/received',
  { immediate: isProvider },
)
const { balance, ensure: ensureWallet } = useWallet()
if (isProvider) await ensureWallet()

const rating = computed(() => ratingData.value?.rating ?? { average: 0, count: 0 })
const recentMatches = computed(() => (matchesData.value?.matches ?? []).slice(0, 3))
const sectorName = computed(() => {
  const slug = profileData.value?.profile?.sector
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? t('prestataireIndex.defaultSectorFallback')
})
const requestsUsageLabel = computed(() => {
  const usage = requestsQuotaData.value?.usage
  if (!usage) return '0 / 0'
  return usage.limit === null ? `${usage.count} / ${t('prestataireIndex.unlimited')}` : `${usage.count} / ${usage.limit}`
})
const formattedBalance = computed(() => (balance.value === null ? '…' : `${balance.value.toLocaleString(languageTag())} F CFA`))
const subscriptionBadge = computed(() => {
  const status = subscriptionData.value?.subscription?.status
  if (status === 'actif') return { label: t('prestataireIndex.badgeActive'), tone: 'active' }
  if (status === 'en_attente') return { label: t('prestataireIndex.badgePending'), tone: 'pending' }
  if (status === 'expire') return { label: t('prestataireIndex.badgeExpired'), tone: 'expired' }
  return { label: t('prestataireIndex.badgeNone'), tone: 'none' }
})
const subscriptionStatus = computed(() => subscriptionData.value?.subscription?.status ?? null)
const profileIncomplete = computed(() => subscriptionStatus.value === null || subscriptionStatus.value === 'expire')
const subscriptionBannerText = computed(() =>
  subscriptionStatus.value === 'expire'
    ? t('prestataireIndex.subscriptionExpiredBanner')
    : t('prestataireIndex.subscriptionIncompleteBanner'),
)

interface ChecklistItem { key: string; label: string; done: boolean; to: string }
const profileChecklist = computed<ChecklistItem[]>(() => {
  const p = profileData.value?.profile
  return [
    { key: 'photo', label: t('prestataireIndex.checklistPhoto'), done: !!p?.photoUrl, to: '/prestataire/profil-professionnel' },
    { key: 'description', label: t('prestataireIndex.checklistDescription'), done: !!p?.description, to: '/prestataire/profil-professionnel' },
    { key: 'rate', label: t('prestataireIndex.checklistRate'), done: (p?.rateFrom ?? 0) > 0, to: '/prestataire/profil-professionnel' },
    { key: 'cv', label: t('prestataireIndex.checklistCv'), done: !!p?.cvUrl, to: '/prestataire/cv' },
    { key: 'languages', label: t('prestataireIndex.checklistLanguages'), done: !!p?.languages?.length, to: '/prestataire/langues' },
    { key: 'formation', label: t('prestataireIndex.checklistFormation'), done: !!p?.formations?.length, to: '/prestataire/formation' },
    { key: 'certifications', label: t('prestataireIndex.checklistCertifications'), done: !!p?.certifications?.length, to: '/prestataire/certifications' },
    { key: 'verified', label: t('prestataireIndex.checklistVerified'), done: !!user.value?.verified, to: '/prestataire/profil?open=verification' },
  ]
})
const completionPercent = computed(() => {
  const items = profileChecklist.value
  return Math.round((items.filter((i) => i.done).length / items.length) * 100)
})
const missingProfileItems = computed(() => profileChecklist.value.filter((i) => !i.done))
</script>

<template>
  <div class="mx-auto max-w-[720px] px-5 py-8">
    <!-- En-tête commun aux deux rôles -->
    <header class="mb-6 flex items-center justify-between">
      <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>
      <NuxtLink
        to="/profil"
        class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
      >
        {{ user?.firstName || t('dashboardClient.greetingFallback') }}
      </NuxtLink>
    </header>

    <!-- ======================= Vue PRESTATAIRE ======================= -->
    <template v-if="isProvider">
      <div class="relative mb-6 overflow-hidden rounded-card border border-hairline bg-dark p-6 shadow-card-sm sm:p-7">
        <div class="float-soft pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
        <div class="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardShared.providerSpaceLabel') }}</p>
            <h1 class="text-[26px] font-extrabold text-white">{{ t('prestataireIndex.greeting', { name: user?.firstName || sectorName }) }}</h1>
            <p class="mt-1.5 text-[13.5px] text-white/70">
              <span v-if="user?.location">📍 {{ user.location }} · </span>{{ sectorName }}
            </p>
          </div>
          <span class="shrink-0 rounded-pill px-3 py-1.5 text-[12.5px] font-bold" :class="BADGE_STYLES[subscriptionBadge.tone]">
            {{ subscriptionBadge.label }}
          </span>
        </div>
      </div>

      <section class="mb-6 rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-[14px] font-bold text-dark">{{ t('prestataireIndex.completionHeading') }}</h2>
            <p class="text-[12.5px] text-muted">{{ t('prestataireIndex.completionSubtitle') }}</p>
          </div>
          <span class="shrink-0 text-[22px] font-extrabold text-primary">{{ completionPercent }}%</span>
        </div>
        <div class="mb-3 h-2 overflow-hidden rounded-pill bg-bg">
          <div class="h-full rounded-pill bg-primary transition-[width] duration-500 ease-out" :style="{ width: `${completionPercent}%` }" />
        </div>
        <div v-if="missingProfileItems.length" class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="item in missingProfileItems"
            :key="item.key"
            :to="item.to"
            class="press inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-white px-3 py-1 text-[12.5px] font-semibold text-muted hover:border-primary/40 hover:text-dark"
          >
            <span aria-hidden="true" class="font-bold text-primary">+</span> {{ item.label }}
          </NuxtLink>
        </div>
        <p v-else class="text-[13px] font-semibold text-primary">{{ t('prestataireIndex.completionDone') }}</p>
      </section>

      <NuxtLink
        v-if="!user?.verified"
        to="/prestataire/profil?open=verification"
        class="press mb-4 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
      >
        <p class="text-[13px] font-semibold text-dark">{{ t('prestataireIndex.verifyBanner') }}</p>
        <span class="shrink-0 font-bold text-primary">→</span>
      </NuxtLink>

      <NuxtLink
        v-if="profileIncomplete"
        to="/abonnement"
        class="press mb-6 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
      >
        <p class="text-[13px] font-semibold text-dark">{{ subscriptionBannerText }}</p>
        <span class="shrink-0 font-bold text-primary">→</span>
      </NuxtLink>

      <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NuxtLink to="/prestataire/demandes" class="card-hover rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm hover:border-primary/40">
          <div class="text-[22px] font-extrabold text-dark">{{ requestsUsageLabel }}</div>
          <div class="text-[11.5px] text-muted">{{ t('prestataireIndex.requestsReceivedLabel') }}</div>
        </NuxtLink>
        <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
          <div class="text-[22px] font-extrabold text-dark">{{ rating.count > 0 ? rating.average.toFixed(1) : '—' }}</div>
          <div class="text-[11.5px] text-muted">{{ t('prestataireIndex.reviewsCount', rating.count) }}</div>
        </div>
        <NuxtLink to="/prestataire/solde" class="card-hover rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm hover:border-primary/40">
          <div class="truncate text-[18px] font-extrabold text-dark">{{ formattedBalance }}</div>
          <div class="text-[11.5px] text-muted">{{ t('prestataireIndex.balanceLabel') }}</div>
        </NuxtLink>
        <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
          <div class="truncate text-[15px] font-extrabold text-dark">{{ sectorName }}</div>
          <div class="text-[11.5px] text-muted">{{ t('prestataireIndex.sectorLabel') }}</div>
        </div>
      </div>

      <section class="mb-6">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-[12px] font-bold uppercase tracking-wide text-muted">{{ t('prestataireIndex.recentRequestsHeading') }}</h2>
          <NuxtLink to="/prestataire/demandes" class="press link-underline text-[12.5px] font-semibold text-primary">{{ t('prestataireIndex.viewAll') }}</NuxtLink>
        </div>
        <ul v-if="recentMatches.length" class="flex flex-col gap-2">
          <li v-for="item in recentMatches" :key="item.request.id">
            <NuxtLink to="/prestataire/demandes" class="press flex items-center justify-between gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40">
              <div class="min-w-0">
                <p class="truncate text-[14px] font-semibold text-dark">{{ item.request.title }}</p>
                <p class="text-[12px] text-muted">{{ sectorLabel(item.request.sector) }} · {{ item.request.location }} · {{ formatDate(item.request.createdAt) }}</p>
              </div>
              <span class="shrink-0 rounded-field bg-dark px-2 py-1 text-[11px] font-bold text-white">{{ item.score.total }}/100</span>
            </NuxtLink>
          </li>
        </ul>
        <div v-else class="rounded-card border border-hairline bg-surface p-5 text-center shadow-card-sm">
          <p class="text-[13px] leading-relaxed text-muted">{{ t('prestataireIndex.noRequestsYet') }}</p>
          <NuxtLink to="/prestataire/profil-professionnel" class="press mt-3 inline-block rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-dark hover:border-primary/50">
            {{ t('prestataireIndex.completeProProfileCta') }}
          </NuxtLink>
        </div>
      </section>

      <!-- Navigation rapide prestataire (fusion des sous-espaces) -->
      <div class="grid grid-cols-2 gap-3">
        <NuxtLink to="/messages" class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40">
          <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardClient.messagesTitle') }}</p>
          <p class="text-[12.5px] leading-relaxed text-muted">{{ t('dashboardClient.messagesDescription') }}</p>
        </NuxtLink>
        <NuxtLink to="/prestataire/profil" class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40">
          <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">{{ t('prestataireIndex.sectorLabel') }}</p>
          <p class="text-[12.5px] leading-relaxed text-muted">{{ t('prestataireIndex.completionSubtitle') }}</p>
        </NuxtLink>
      </div>
    </template>

    <!-- ======================= Vue CHERCHEUR ========================= -->
    <template v-else>
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardClient.spaceLabel') }}</p>
          <h1 class="text-[21px] font-extrabold text-dark">{{ t('dashboardClient.greeting', { name: user?.firstName || t('dashboardClient.greetingFallback') }) }}</h1>
          <p v-if="user?.location" class="mt-1 text-[13px] text-muted">📍 {{ user.location }}</p>
        </div>
        <NuxtLink to="/" class="press shrink-0 rounded-field bg-primary px-5 py-3 text-[14px] font-semibold text-white hover:bg-primary-hover">
          {{ t('dashboardClient.searchServiceCta') }}
        </NuxtLink>
      </div>

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
        <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
          <div class="text-[22px] font-extrabold text-dark">{{ favoritesCount }}</div>
          <div class="text-[11.5px] text-muted">{{ t('dashboardClient.favoritesLabel') }}</div>
        </div>
      </div>

      <section class="mb-6">
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

      <!-- Navigation rapide chercheur (fusion des sous-espaces) -->
      <div class="grid grid-cols-2 gap-3">
        <NuxtLink to="/messages" class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40">
          <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardClient.messagesTitle') }}</p>
          <p class="text-[12.5px] leading-relaxed text-muted">{{ t('dashboardClient.messagesDescription') }}</p>
        </NuxtLink>
        <NuxtLink to="/favoris" class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40">
          <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardClient.favoritesTitle') }}</p>
          <p class="text-[12.5px] leading-relaxed text-muted">{{ t('dashboardClient.favoritesDescription') }}</p>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
