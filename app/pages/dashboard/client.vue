<script setup lang="ts">
import type { User } from '~~/server/utils/userStore'

/**
 * Dashboard client minimal (#64) : n'existait pas encore côté client
 * (contrairement au dashboard prestataire, #37). On reste volontairement
 * simple — un accès au compte et un compteur de favoris — plutôt que
 * d'anticiper des sections qui ne sont pas encore spécifiées.
 */

definePageMeta({ layout: 'blank' })

const { data: sessionData } = await useFetch<{ user: User }>('/api/auth/session')
const { data: favoritesData } = await useFetch<{ favorites: { providerId: string }[] }>('/api/favorites')
const { data: contactsQuotaData } = await useFetch<{ usage: { count: number; limit: number; month: string } }>(
  '/api/quotas/contacts',
)

const favoritesCount = computed(() => favoritesData.value?.favorites.length ?? 0)
const contactsUsageLabel = computed(() => {
  const usage = contactsQuotaData.value?.usage
  if (!usage) return '0 / 3'
  return `${usage.count} / ${usage.limit}`
})

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

    <h1 class="mb-1 text-[19px] font-bold text-dark">
      Mon espace, {{ sessionData?.user?.contact ?? 'client' }}
    </h1>
    <p class="mb-6 text-[13.5px] text-muted">Retrouvez vos prestataires favoris et vos demandes.</p>

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
        <div>
          <p class="text-[14.5px] font-bold text-dark">Contacts ce mois</p>
          <p class="text-[13px] text-muted">Mises en relation gratuites incluses (formule gratuite)</p>
        </div>
        <span class="rounded-pill bg-bg px-3 py-1 text-[13px] font-bold text-dark">
          {{ contactsUsageLabel }} Contacts ce mois
        </span>
      </div>

      <NuxtLink
        to="/favoris"
        class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-5 shadow-card-sm hover:border-primary"
      >
        <div>
          <p class="text-[14.5px] font-bold text-dark">Favoris</p>
          <p class="text-[13px] text-muted">Prestataires sauvegardés pour les recontacter plus tard</p>
        </div>
        <span class="rounded-pill bg-primary/12 px-3 py-1 text-[13px] font-bold text-primary">
          {{ favoritesCount }}
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
