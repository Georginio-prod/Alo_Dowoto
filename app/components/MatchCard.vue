<script setup lang="ts">
import type { ConversationSummary } from '~~/server/utils/conversationStore'
import type { MatchedProvider } from '~~/server/utils/requestStore'

const props = withDefaults(
  defineProps<{
    match: MatchedProvider
    rank: number
    /** État initial connu par le parent (ex. liste de favoris déjà chargée, #64). */
    isFavorite?: boolean
  }>(),
  { isFavorite: false },
)

const emit = defineEmits<{ 'favorite-changed': [] }>()

const SCORE_BARS: { key: keyof MatchedProvider['score']['breakdown']; label: string }[] = [
  { key: 'skills', label: 'Compétences' },
  { key: 'location', label: 'Localisation' },
  { key: 'reviews', label: 'Avis' },
  { key: 'availability', label: 'Disponibilité' },
  { key: 'budget', label: 'Budget' },
]

const filledStars = computed(() => Math.round(props.match.rating))
const isContacting = ref(false)

const favorite = ref(props.isFavorite)
const isTogglingFavorite = ref(false)

watch(
  () => props.isFavorite,
  (value) => {
    favorite.value = value
  },
)

// Premier contact depuis les résultats de matching (#58/#59) : crée (ou
// retrouve, idempotent) la conversation avec ce prestataire puis ouvre le
// thread de messagerie.
async function contact() {
  if (isContacting.value) return
  isContacting.value = true
  try {
    const { conversation } = await $fetch<{ conversation: ConversationSummary }>('/api/conversations', {
      method: 'POST',
      body: { providerId: props.match.providerId },
    })
    navigateTo(`/messages/${conversation.id}`)
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      navigateTo({ path: '/auth', query: { role: 'client' } })
      return
    }
  } finally {
    isContacting.value = false
  }
}

// Pas encore de profil public dédié pour l'instant (hors périmètre de ce
// lot). Bouton posé pour la maquette, sans action.
function viewProfile() {}

/** Ajoute/retire ce prestataire des favoris du client connecté (#64). */
async function toggleFavorite() {
  if (isTogglingFavorite.value) return
  isTogglingFavorite.value = true
  try {
    if (favorite.value) {
      await $fetch(`/api/favorites/${props.match.providerId}`, { method: 'DELETE' })
      favorite.value = false
    } else {
      await $fetch('/api/favorites', { method: 'POST', body: { providerId: props.match.providerId } })
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
  <div class="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card-sm sm:flex-row">
    <div class="flex shrink-0 flex-col items-center gap-2 sm:w-[150px]">
      <div class="flex items-center gap-2 self-start sm:self-center">
        <span class="rounded-pill bg-dark px-2.5 py-1 text-[12px] font-bold text-white">#{{ rank }}</span>
        <span v-if="rank === 1" class="rounded-pill bg-primary/12 px-2.5 py-1 text-[11px] font-bold text-primary">
          Meilleur match
        </span>
      </div>
      <div
        class="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-[repeating-linear-gradient(135deg,#e5e7eb_0_10px,#eef0f2_10px_20px)]"
      >
        <span class="rounded-pill bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white">photo</span>
      </div>
    </div>

    <div class="min-w-0 flex-1">
      <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[15.5px] font-bold text-dark">{{ match.displayName }}</div>
          <p class="text-[13px] text-muted">{{ match.subSector }} · {{ match.experienceYears }} ans d'expérience</p>
        </div>
        <div class="rounded-field bg-dark px-3 py-1.5 text-center">
          <div class="text-[17px] font-extrabold leading-none text-white">{{ match.score.total }}</div>
          <div class="text-[9.5px] font-semibold uppercase tracking-wide text-white/70">/ 100</div>
        </div>
      </div>

      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-[13px] text-dark">
          <span aria-hidden="true">
            <span v-for="n in 5" :key="n" :class="n <= filledStars ? 'text-star' : 'text-hairline'">★</span>
          </span>
          <span class="ml-1 font-semibold">{{ match.rating.toFixed(1) }}</span>
          <span class="text-muted"> ({{ match.reviewCount }} avis)</span>
        </span>
        <span
          v-if="match.verified"
          class="rounded-pill bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary"
        >
          Certifié, assuré
        </span>
      </div>

      <div class="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <div v-for="bar in SCORE_BARS" :key="bar.key" class="text-[12px]">
          <div class="mb-0.5 flex justify-between text-muted">
            <span>{{ bar.label }}</span>
            <span class="font-semibold text-dark">{{ match.score.breakdown[bar.key] }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-pill bg-bg">
            <div class="h-full rounded-pill bg-primary" :style="{ width: `${match.score.breakdown[bar.key]}%` }" />
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="press rounded-field bg-dark px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1a3a28] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isContacting"
          @click="contact"
        >
          {{ isContacting ? 'Ouverture…' : 'Contacter' }}
        </button>
        <button
          type="button"
          class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          @click="viewProfile"
        >
          Voir le profil
        </button>
        <button
          type="button"
          class="press rounded-field border px-3 py-2 text-[13px] font-semibold"
          :class="favorite ? 'border-primary bg-primary/10 text-primary' : 'border-hairline bg-white text-muted hover:text-dark'"
          :disabled="isTogglingFavorite"
          :aria-pressed="favorite"
          :title="favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
          @click="toggleFavorite"
        >
          {{ favorite ? '★ Favori' : '☆ Favoris' }}
        </button>
      </div>
    </div>
  </div>
</template>
