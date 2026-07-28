<script setup lang="ts">
import type { ServiceRequest } from '~~/server/utils/requestStore'

/**
 * « Mon espace » chercheur : vue d'ensemble de l'activité (demandes,
 * contacts, favoris) inspirée d'une maquette de référence fournie par
 * l'utilisateur, avec les mêmes codes visuels que « Mon espace »
 * prestataire (app/pages/prestataire/index.vue) pour une expérience
 * cohérente entre les deux profils.
 */

definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t, locale, locales } = useI18n({ useScope: 'global' })
const { user } = useSession()
const { data: favoritesData } = await useFetch<{ favorites: { providerId: string }[] }>('/api/favorites')
const { data: contactsQuotaData } = await useFetch<{ usage: { count: number; limit: number; month: string } }>(
  '/api/quotas/contacts',
)
const { data: requestsData } = await useFetch<{ requests: ServiceRequest[] }>('/api/requests')

const myRequests = computed(() => requestsData.value?.requests ?? [])
const favoritesCount = computed(() => favoritesData.value?.favorites.length ?? 0)
const contactsUsageLabel = computed(() => {
  const usage = contactsQuotaData.value?.usage
  if (!usage) return '0 / 3'
  return `${usage.count} / ${usage.limit}`
})

function formatDate(timestamp: number): string {
  const languageTag = (locales.value as Array<{ code: string, language?: string }>)
    .find((l) => l.code === locale.value)?.language ?? 'fr-FR'
  return new Date(timestamp).toLocaleDateString(languageTag, { day: '2-digit', month: 'short' })
}

function restartDemo() {
  navigateTo('/')
}
</script>

<template>
  <div class="mx-auto max-w-[720px] px-5 py-8">
    <header class="mb-6 flex items-center justify-between">
      <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>
      <button
        type="button"
        class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
        @click="restartDemo"
      >
        {{ t('dashboardClient.restartDemo') }}
      </button>
    </header>

    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardClient.spaceLabel') }}</p>
        <h1 class="text-[21px] font-extrabold text-dark">{{ t('dashboardClient.greeting', { name: user?.firstName || t('dashboardClient.greetingFallback') }) }}</h1>
        <p v-if="user?.location" class="mt-1 text-[13px] text-muted">📍 {{ user.location }}</p>
      </div>
      <NuxtLink
        to="/"
        class="press shrink-0 rounded-field bg-primary px-5 py-3 text-[14px] font-semibold text-white hover:bg-primary-hover"
      >
        {{ t('dashboardClient.searchServiceCta') }}
      </NuxtLink>
    </div>

    <NuxtLink
      v-if="!user?.verified"
      v-reveal
      to="/profil"
      class="press mb-6 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
    >
      <p class="text-[13px] font-semibold text-dark">
        {{ t('dashboardClient.verifyBanner') }}
      </p>
      <span class="shrink-0 font-bold text-primary">→</span>
    </NuxtLink>

    <div v-reveal :style="{ '--reveal-delay': '60ms' }" class="mb-6 grid grid-cols-3 gap-3">
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

    <section v-reveal :style="{ '--reveal-delay': '120ms' }" class="mb-6">
      <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">{{ t('dashboardClient.recentRequestsHeading') }}</h2>

      <div v-if="myRequests.length === 0" class="rounded-card border border-hairline bg-surface p-6 text-center shadow-card-sm">
        <p class="mb-3 text-[13.5px] text-muted">{{ t('dashboardClient.noRequestsYet') }}</p>
        <NuxtLink
          to="/demande"
          class="press inline-block rounded-field border border-hairline bg-white px-4 py-2.5 text-[13.5px] font-semibold text-dark hover:border-primary"
        >
          {{ t('dashboardClient.postFirstRequestCta') }}
        </NuxtLink>
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li v-for="request in myRequests" :key="request.id">
          <NuxtLink
            :to="`/matching/${request.id}`"
            class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
          >
            <div class="min-w-0">
              <p class="truncate text-[14px] font-semibold text-dark">{{ request.title }}</p>
              <p class="text-[12px] text-muted">{{ formatDate(request.createdAt) }}</p>
            </div>
            <span class="shrink-0 font-bold text-primary">→</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div v-reveal :style="{ '--reveal-delay': '180ms' }" class="grid grid-cols-2 gap-3">
      <NuxtLink
        to="/messages"
        class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardClient.messagesTitle') }}</p>
        <p class="text-[12.5px] leading-relaxed text-muted">{{ t('dashboardClient.messagesDescription') }}</p>
      </NuxtLink>
      <NuxtLink
        to="/favoris"
        class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardClient.favoritesTitle') }}</p>
        <p class="text-[12.5px] leading-relaxed text-muted">{{ t('dashboardClient.favoritesDescription') }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
