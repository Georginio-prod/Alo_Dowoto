<script setup lang="ts">
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

interface FavoriteItem {
  providerId: string
  createdAt: number
  provider: ProviderSearchResult | null
}

definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t } = useI18n({ useScope: 'global' })
const { data, pending, refresh } = await useFetch<{ favorites: FavoriteItem[] }>('/api/favorites')
const favorites = computed(() => data.value?.favorites ?? [])

function goToResults() {
  navigateTo('/resultats')
}
</script>

<template>
  <div>
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <p class="text-[14.5px] text-muted">{{ t('favorisPage.title') }}</p>
        </div>

        <NuxtLink
          to="/dashboard/client"
          class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
        >
          {{ t('favorisPage.backToSpace') }}
        </NuxtLink>
      </div>
    </header>

    <div class="mx-auto max-w-[1100px] px-5 py-6">
      <p v-if="pending" class="text-[13px] text-muted">{{ t('favorisPage.loading') }}</p>

      <ResultsEmptyState
        v-else-if="favorites.length === 0"
        :title="t('favorisPage.emptyTitle')"
        :description="t('favorisPage.emptyDescription')"
        :action-label="t('favorisPage.emptyActionLabel')"
        @action="goToResults"
      />

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
        <template v-for="item in favorites" :key="item.providerId">
          <ProviderCard
            v-if="item.provider"
            :provider="item.provider"
            :is-favorite="true"
            @favorite-changed="refresh"
          />
          <div v-else class="rounded-card border border-hairline bg-surface p-4 text-[13px] text-muted">
            {{ t('favorisPage.unavailableProvider', { id: item.providerId }) }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
