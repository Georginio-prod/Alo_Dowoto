<script setup lang="ts">
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

const props = withDefaults(
  defineProps<{
    provider: ProviderSearchResult
    /** État initial connu par le parent (ex. liste de favoris déjà chargée, #64). */
    isFavorite?: boolean
  }>(),
  { isFavorite: false },
)

const emit = defineEmits<{ 'favorite-changed': [] }>()

const filledStars = computed(() => Math.round(props.provider.rating))

const favorite = ref(props.isFavorite)
const isTogglingFavorite = ref(false)
const showProfile = ref(false)

watch(
  () => props.isFavorite,
  (value) => {
    favorite.value = value
  },
)

/**
 * Ajoute/retire ce prestataire des favoris du client connecté (#64). L'état
 * est géré ici (optimiste + persistance via l'API) pour que le bouton
 * fonctionne de façon autonome, que la carte soit affichée dans les
 * résultats, le matching ou la liste de favoris elle-même.
 */
async function toggleFavorite() {
  if (isTogglingFavorite.value) return
  isTogglingFavorite.value = true
  try {
    if (favorite.value) {
      await $fetch(`/api/favorites/${props.provider.id}`, { method: 'DELETE' })
      favorite.value = false
    } else {
      await $fetch('/api/favorites', { method: 'POST', body: { providerId: props.provider.id } })
      favorite.value = true
    }
    emit('favorite-changed')
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      navigateTo({ path: '/auth', query: { role: 'client' } })
      return
    }
    // Compte non-client ou erreur inattendue : on n'affiche pas d'erreur
    // brute, le bouton reprend simplement son état précédent.
  } finally {
    isTogglingFavorite.value = false
  }
}
</script>

<template>
  <div class="flex flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card-sm">
    <div
      class="flex h-[140px] items-center justify-center bg-[repeating-linear-gradient(135deg,#e5e7eb_0_10px,#eef0f2_10px_20px)]"
    >
      <span class="rounded-pill bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">photo</span>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[15px] font-bold text-dark">{{ provider.displayName }}</span>
        <span
          v-if="provider.verified"
          class="rounded-pill bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary"
        >
          ✓ Vérifié
        </span>
      </div>

      <p class="text-[13px] text-muted">{{ provider.subSector }} · {{ provider.city }}</p>

      <p class="text-[13.5px] text-dark">
        <span aria-hidden="true">
          <span v-for="n in 5" :key="n" :class="n <= filledStars ? 'text-star' : 'text-hairline'">★</span>
        </span>
        <span class="ml-1 font-semibold">{{ provider.rating.toFixed(1) }}</span>
        <span class="text-muted"> ({{ provider.reviewCount }} avis)</span>
      </p>

      <p class="text-[14.5px] font-bold text-dark">À partir de {{ provider.priceFrom }} FCFA</p>

      <div class="mt-auto flex gap-2">
        <button
          type="button"
          class="press flex-1 rounded-field bg-dark py-2.5 text-[13.5px] font-semibold text-white hover:bg-dark-hover"
          @click="showProfile = true"
        >
          Voir le profil
        </button>
        <button
          type="button"
          class="press rounded-field border px-3 text-[13px] font-semibold"
          :class="favorite ? 'border-primary bg-primary/10 text-primary' : 'border-hairline bg-white text-muted hover:text-dark'"
          :disabled="isTogglingFavorite"
          :aria-pressed="favorite"
          :title="favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
          @click="toggleFavorite"
        >
          {{ favorite ? '★' : '☆' }}
        </button>
      </div>
    </div>

    <ProviderProfileModal v-if="showProfile" :provider-id="provider.id" @close="showProfile = false" />
  </div>
</template>
