<script setup lang="ts">
import type { MatchedProvider } from '~~/server/utils/requestStore'

const props = defineProps<{
  match: MatchedProvider
  rank: number
}>()

const SCORE_BARS: { key: keyof MatchedProvider['score']['breakdown']; label: string }[] = [
  { key: 'skills', label: 'Compétences' },
  { key: 'location', label: 'Localisation' },
  { key: 'reviews', label: 'Avis' },
  { key: 'availability', label: 'Disponibilité' },
  { key: 'budget', label: 'Budget' },
]

const filledStars = computed(() => Math.round(props.match.rating))

// Pas encore de canal de contact/de profil public dédié (#57, messagerie —
// hors périmètre de ce lot). Boutons posés pour la maquette, sans action.
function contact() {}
function viewProfile() {}
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
          class="press rounded-field bg-dark px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1a3a28]"
          @click="contact"
        >
          Contacter
        </button>
        <button
          type="button"
          class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          @click="viewProfile"
        >
          Voir le profil
        </button>
      </div>
    </div>
  </div>
</template>
