<script setup lang="ts">
import type { MatchedProvider, ServiceRequest } from '~~/server/utils/requestStore'

interface RequestResponse {
  request: ServiceRequest
  matches: MatchedProvider[]
}

interface ContactsQuotaResponse {
  usage: { count: number; limit: number; month: string }
}

definePageMeta({ layout: 'blank' })

const route = useRoute()
const requestId = computed(() => String(route.params.id))

const { data, pending, error } = await useFetch<RequestResponse>(() => `/api/requests/${requestId.value}`)

const matches = computed(() => data.value?.matches ?? [])

// Favoris déjà enregistrés par le client (#64), chargés une seule fois pour
// tous les profils du top de matching plutôt qu'une requête par carte.
const { data: favoritesData, refresh: refreshFavorites } = await useFetch<{ favorites: { providerId: string }[] }>(
  '/api/favorites',
)
const favoriteProviderIds = computed(() => new Set((favoritesData.value?.favorites ?? []).map((f) => f.providerId)))

// Quota client de contacts (#63) : chargé une seule fois pour toutes les
// cartes, plutôt qu'un GET par carte. Le bouton « Contacter » de chaque
// MatchCard se désactive dès que le quota gratuit (3/mois) est atteint.
const { data: contactsQuotaData, refresh: refreshContactsQuota } = await useFetch<ContactsQuotaResponse>(
  '/api/quotas/contacts',
)
const contactQuotaReached = computed(() => {
  const usage = contactsQuotaData.value?.usage
  if (!usage) return false
  return usage.count >= usage.limit
})

function restartDemo() {
  navigateTo('/')
}

function newRequest() {
  navigateTo('/demande')
}
</script>

<template>
  <div>
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <p v-if="data?.request" class="text-[14.5px] text-muted">
            Meilleurs profils pour <strong class="text-dark">{{ data.request.title }}</strong>
          </p>
        </div>

        <button
          type="button"
          class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          @click="restartDemo"
        >
          ↺ Recommencer la démo
        </button>
      </div>
    </header>

    <div class="mx-auto max-w-[900px] px-5 py-6">
      <p v-if="pending" class="text-[13px] text-muted">Chargement…</p>

      <ResultsEmptyState
        v-else-if="error"
        title="Demande introuvable"
        description="Cette demande n'existe pas ou a expiré."
        action-label="Publier une nouvelle demande"
        @action="newRequest"
      />

      <ResultsEmptyState
        v-else-if="matches.length === 0"
        description="Essayez d'élargir votre recherche (compétences, localisation ou budget) et republiez votre demande."
        action-label="Publier une nouvelle demande"
        @action="newRequest"
      />

      <div v-else class="flex flex-col gap-4">
        <MatchCard
          v-for="(match, index) in matches"
          :key="match.providerId"
          :match="match"
          :rank="index + 1"
          :is-favorite="favoriteProviderIds.has(match.providerId)"
          :contact-quota-reached="contactQuotaReached"
          @favorite-changed="refreshFavorites"
          @contacted="refreshContactsQuota"
        />
      </div>
    </div>
  </div>
</template>
