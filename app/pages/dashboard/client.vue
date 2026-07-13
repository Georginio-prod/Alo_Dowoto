<script setup lang="ts">
import type { PublicUser } from '~~/server/utils/userStore'
import type { ServiceRequest } from '~~/server/utils/requestStore'

/**
 * « Mon espace » chercheur : vue d'ensemble de l'activité (demandes,
 * contacts, favoris) inspirée d'une maquette de référence fournie par
 * l'utilisateur, avec les mêmes codes visuels que « Mon espace »
 * prestataire (app/pages/prestataire/index.vue) pour une expérience
 * cohérente entre les deux profils.
 */

definePageMeta({ layout: 'blank' })

const { data: sessionData } = await useFetch<{ user: PublicUser }>('/api/auth/session')
const { data: favoritesData } = await useFetch<{ favorites: { providerId: string }[] }>('/api/favorites')
const { data: contactsQuotaData } = await useFetch<{ usage: { count: number; limit: number; month: string } }>(
  '/api/quotas/contacts',
)
const { data: requestsData } = await useFetch<{ requests: ServiceRequest[] }>('/api/requests')

const user = computed(() => sessionData.value?.user ?? null)
const myRequests = computed(() => requestsData.value?.requests ?? [])
const favoritesCount = computed(() => favoritesData.value?.favorites.length ?? 0)
const contactsUsageLabel = computed(() => {
  const usage = contactsQuotaData.value?.usage
  if (!usage) return '0 / 3'
  return `${usage.count} / ${usage.limit}`
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
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
        ↺ Recommencer la démo
      </button>
    </header>

    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">Espace chercheur</p>
        <h1 class="text-[21px] font-extrabold text-dark">Bonjour {{ user?.firstName || 'vous' }}</h1>
        <p v-if="user?.location" class="mt-1 text-[13px] text-muted">📍 {{ user.location }}</p>
      </div>
      <NuxtLink
        to="/"
        class="press shrink-0 rounded-field bg-primary px-5 py-3 text-[14px] font-semibold text-white hover:bg-primary-hover"
      >
        Chercher un service
      </NuxtLink>
    </div>

    <div class="mb-6 grid grid-cols-3 gap-3">
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ myRequests.length }}</div>
        <div class="text-[11.5px] text-muted">Demandes envoyées</div>
      </div>
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ contactsUsageLabel }}</div>
        <div class="text-[11.5px] text-muted">Contacts ce mois</div>
      </div>
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ favoritesCount }}</div>
        <div class="text-[11.5px] text-muted">Favoris</div>
      </div>
    </div>

    <section class="mb-6">
      <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">Demandes récentes</h2>

      <div v-if="myRequests.length === 0" class="rounded-card border border-hairline bg-surface p-6 text-center shadow-card-sm">
        <p class="mb-3 text-[13.5px] text-muted">Aucune demande pour l'instant.</p>
        <NuxtLink
          to="/demande"
          class="press inline-block rounded-field border border-hairline bg-white px-4 py-2.5 text-[13.5px] font-semibold text-dark hover:border-primary"
        >
          Publier ma première demande
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

    <div class="grid grid-cols-2 gap-3">
      <NuxtLink
        to="/messages"
        class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">Messages</p>
        <p class="text-[12.5px] leading-relaxed text-muted">Vos conversations avec les prestataires contactés</p>
      </NuxtLink>
      <NuxtLink
        to="/favoris"
        class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">Favoris</p>
        <p class="text-[12.5px] leading-relaxed text-muted">Prestataires sauvegardés pour les recontacter plus tard</p>
      </NuxtLink>
    </div>
  </div>
</template>
