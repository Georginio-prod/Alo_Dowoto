<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { ProviderMatchedRequest } from '~~/server/utils/requestStore'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'

/**
 * Corps prestataire du dashboard unifié (`pages/dashboard/index.vue`), aligné
 * sur l'écran 6.1 « Tableau de bord » de la maquette « WorkTogo — App mobile,
 * de A à Z » : une carte encre regroupe identité et indicateurs (le code
 * couleur sombre distingue d'emblée cet espace de celui du chercheur), suivie
 * de la jauge de quota mensuel puis des demandes reçues.
 *
 * La maquette montre en plus un séquestre « à encaisser » et des actions
 * accepter/refuser : ces flux n'ont pas encore d'endpoint (voir
 * `listRequestsForProvider` dans server/utils/requestStore.ts), ils sont donc
 * volontairement absents plutôt qu'affichés à vide.
 *
 * Monté uniquement pour le rôle prestataire : ses appels API n'ont donc pas
 * besoin d'être conditionnés (`immediate`).
 */

const BADGE_STYLES: Record<string, string> = {
  none: 'bg-white/10 text-white/80',
  pending: 'bg-primary/20 text-primary',
  active: 'bg-primary text-white',
  expired: 'bg-error/20 text-error',
}

const { t, locale, locales } = useI18n({ useScope: 'global' })
const { user } = useSession()

const { data: profileData } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const { data: subscriptionData } = await useFetch<{ subscription: Subscription | null }>('/api/subscriptions/me')
const { data: requestsQuotaData } = await useFetch<{ usage: { count: number; limit: number | null; month: string } }>('/api/quotas/requests-received')
const { data: ratingData } = await useFetch<{ rating: { average: number; count: number } }>('/api/reviews/me')
const { data: matchesData } = await useFetch<{ matches: ProviderMatchedRequest[] }>('/api/requests/received')
const { balance, ensure: ensureWallet } = useWallet()
await ensureWallet()

const rating = computed(() => ratingData.value?.rating ?? { average: 0, count: 0 })
const allMatches = computed(() => matchesData.value?.matches ?? [])
const recentMatches = computed(() => allMatches.value.slice(0, 3))
const sectorName = computed(() => {
  const slug = profileData.value?.profile?.sector
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? t('prestataireIndex.defaultSectorFallback')
})
const requestsUsageLabel = computed(() => {
  const usage = requestsQuotaData.value?.usage
  if (!usage) return '0 / 0'
  return usage.limit === null ? `${usage.count} / ${t('prestataireIndex.unlimited')}` : `${usage.count} / ${usage.limit}`
})
// Une formule illimitée n'a pas de jauge à remplir : la carte bascule alors
// sur le seul compteur.
const requestsQuotaPercent = computed(() => {
  const usage = requestsQuotaData.value?.usage
  if (!usage?.limit) return null
  return Math.min(100, Math.round((usage.count / usage.limit) * 100))
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
    { key: 'verified', label: t('prestataireIndex.checklistVerified'), done: !!user.value?.verified, to: '/profil?open=verification' },
  ]
})
const completionPercent = computed(() => {
  const items = profileChecklist.value
  return Math.round((items.filter((i) => i.done).length / items.length) * 100)
})
const missingProfileItems = computed(() => profileChecklist.value.filter((i) => !i.done))

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
    <!-- Carte encre : identité + indicateurs réunis en un seul bloc. -->
    <div class="relative mb-4 overflow-hidden rounded-card border border-hairline bg-dark p-5 shadow-card-sm sm:p-6">
      <div class="float-soft pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
      <div class="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardShared.providerSpaceLabel') }}</p>
          <h1 class="text-[24px] font-extrabold text-white">{{ t('prestataireIndex.greeting', { name: user?.firstName || sectorName }) }}</h1>
          <p class="mt-1.5 text-[13.5px] text-white/70">
            <span v-if="user?.location">📍 {{ user.location }} · </span>{{ sectorName }}
          </p>
        </div>
        <span class="shrink-0 rounded-pill px-3 py-1.5 text-[12.5px] font-bold" :class="BADGE_STYLES[subscriptionBadge.tone]">
          {{ subscriptionBadge.label }}
        </span>
      </div>

      <div class="relative mt-5 grid grid-cols-3 gap-2.5">
        <NuxtLink to="/prestataire/solde" class="press rounded-field bg-white/8 p-3 hover:bg-white/12">
          <span class="block truncate text-[17px] font-extrabold text-primary">{{ formattedBalance }}</span>
          <span class="mt-0.5 block text-[11px] leading-tight text-white/60">{{ t('prestataireIndex.balanceLabel') }}</span>
        </NuxtLink>
        <NuxtLink to="/prestataire/demandes" class="press rounded-field bg-white/8 p-3 hover:bg-white/12">
          <span class="block text-[17px] font-extrabold text-white">{{ allMatches.length }}</span>
          <span class="mt-0.5 block text-[11px] leading-tight text-white/60">{{ t('prestataireIndex.totalRequestsLabel') }}</span>
        </NuxtLink>
        <div class="rounded-field bg-white/8 p-3">
          <span class="block text-[17px] font-extrabold text-white">
            <span class="text-star" aria-hidden="true">★</span> {{ rating.count > 0 ? rating.average.toFixed(1) : '—' }}
          </span>
          <span class="mt-0.5 block text-[11px] leading-tight text-white/60">{{ t('prestataireIndex.reviewsCount', rating.count) }}</span>
        </div>
      </div>
    </div>

    <!-- Quota mensuel : jauge + passage à la formule supérieure, là où le
         prestataire constate qu'il plafonne. -->
    <section class="mb-6 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-[14px] font-bold text-dark">{{ t('prestataireIndex.quotaHeading') }}</h2>
          <p class="text-[12.5px] text-muted">{{ requestsUsageLabel }} · {{ t('prestataireIndex.requestsReceivedLabel') }}</p>
        </div>
        <NuxtLink to="/abonnement" class="press link-underline shrink-0 text-[12.5px] font-semibold text-primary">
          {{ t('prestataireIndex.upgradeCta') }}
        </NuxtLink>
      </div>
      <div v-if="requestsQuotaPercent !== null" class="mt-3 h-2 overflow-hidden rounded-pill bg-bg">
        <div class="h-full rounded-pill bg-primary transition-[width] duration-500 ease-out" :style="{ width: `${requestsQuotaPercent}%` }" />
      </div>
    </section>

    <section class="mb-6">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="flex items-center gap-2 text-[15px] font-bold text-dark">
          {{ t('prestataireIndex.recentRequestsHeading') }}
          <span v-if="recentMatches.length" class="rounded-pill bg-error px-2 py-0.5 text-[11px] font-bold text-white">
            {{ recentMatches.length }}
          </span>
        </h2>
        <NuxtLink to="/prestataire/demandes" class="press link-underline text-[12.5px] font-semibold text-primary">{{ t('prestataireIndex.viewAll') }}</NuxtLink>
      </div>
      <ul v-if="recentMatches.length" class="flex flex-col gap-2">
        <li v-for="item in recentMatches" :key="item.request.id">
          <NuxtLink to="/prestataire/demandes" class="press block rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40">
            <span class="flex items-baseline justify-between gap-3">
              <span class="min-w-0 truncate text-[14px] font-semibold text-dark">{{ item.request.title }}</span>
              <span class="shrink-0 text-[14px] font-extrabold text-primary">{{ item.request.budgetMax.toLocaleString(languageTag()) }} F</span>
            </span>
            <span class="mt-0.5 flex items-center justify-between gap-3">
              <span class="min-w-0 truncate text-[12px] text-muted">
                {{ sectorLabel(item.request.sector) }} · {{ item.request.location }} · {{ formatDate(item.request.createdAt) }}
              </span>
              <span class="shrink-0 rounded-field bg-dark px-2 py-1 text-[11px] font-bold text-white">{{ item.score.total }}/100</span>
            </span>
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
      to="/profil?open=verification"
      class="press mb-4 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
    >
      <p class="text-[13px] font-semibold text-dark">{{ t('prestataireIndex.verifyBanner') }}</p>
      <span class="shrink-0 font-bold text-primary">→</span>
    </NuxtLink>

    <NuxtLink
      v-if="profileIncomplete"
      to="/abonnement"
      class="press flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
    >
      <p class="text-[13px] font-semibold text-dark">{{ subscriptionBannerText }}</p>
      <span class="shrink-0 font-bold text-primary">→</span>
    </NuxtLink>
  </div>
</template>
