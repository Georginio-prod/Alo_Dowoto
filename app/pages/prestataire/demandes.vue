<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { ProviderMatchedRequest } from '~~/server/utils/requestStore'

/**
 * « Demandes reçues » prestataire (#hub-profil-prestataire) : liste des
 * demandes clientes où ce prestataire figure dans le top de correspondances
 * (server/utils/requestStore.ts, listRequestsForProvider) — pas de flux
 * d'acceptation/refus dans ce lot, uniquement la visibilité sur ce qui a
 * déjà compté dans son quota mensuel (voir la carte quota ci-dessous). Le
 * bandeau d'explication ci-dessous et le lien vers /messages existent parce
 * que « reçues » prêtait à confusion : ces demandes sont des correspondances
 * calculées à la création, pas des messages effectivement envoyés par le
 * client (celui-ci choisit qui contacter depuis sa propre liste de matches).
 */
definePageMeta({ layout: 'dashboard-prestataire', middleware: 'auth', authRole: 'prestataire' })

const URGENCY_LABELS: Record<string, string> = {
  immediate: 'Immédiate',
  semaine: 'Sous la semaine',
  flexible: 'Flexible',
}

const { data: matchesData } = await useFetch<{ matches: ProviderMatchedRequest[] }>('/api/requests/received')
const { data: quotaData } = await useFetch<{ usage: { count: number; limit: number | null; month: string } }>(
  '/api/quotas/requests-received',
)
const { data: profileData } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')

const matches = computed(() => matchesData.value?.matches ?? [])
// Même définition que professionalProfileComplete dans app/pages/profil.vue :
// distingue « profil pas encore assez rempli pour matcher » de « profil complet,
// juste aucune demande pour l'instant » dans l'état vide ci-dessous.
const profileComplete = computed(() => !!(profileData.value?.profile?.photoUrl && profileData.value?.profile?.description))
const quotaLabel = computed(() => {
  const usage = quotaData.value?.usage
  if (!usage) return '0 / 0'
  return usage.limit === null ? `${usage.count} / Illimité` : `${usage.count} / ${usage.limit}`
})

function sectorLabel(slug?: string) {
  if (!slug) return null
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? slug
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatBudget(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F CFA`
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">Espace prestataire</p>
        <h1 class="text-[21px] font-extrabold text-dark">Demandes reçues</h1>
        <p class="mt-1 text-[13px] text-muted">Les demandes clientes correspondant à votre profil.</p>
      </div>
      <div class="shrink-0 rounded-card border border-hairline bg-surface px-4 py-2.5 text-center shadow-card-sm">
        <div class="text-[16px] font-extrabold text-dark">{{ quotaLabel }}</div>
        <div class="text-[11px] text-muted">Ce mois-ci</div>
      </div>
    </div>

    <div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-bg p-4">
      <p class="text-[12.5px] leading-relaxed text-muted">
        Ces demandes correspondent à votre profil, mais c'est le client qui choisit qui contacter — être listé ici
        ne veut pas dire qu'il vous a déjà écrit.
      </p>
      <NuxtLink to="/messages" class="press shrink-0 text-[12.5px] font-semibold text-primary">
        Voir mes messages →
      </NuxtLink>
    </div>

    <div v-if="matches.length === 0 && profileComplete" class="rounded-card border border-hairline bg-surface p-6 text-center shadow-card-sm">
      <p class="text-[13.5px] text-muted">
        Aucune demande pour l'instant. Revenez régulièrement : de nouvelles demandes sont matchées dès qu'un client
        publie dans votre secteur.
      </p>
    </div>

    <div v-else-if="matches.length === 0" class="rounded-card border border-hairline bg-surface p-6 text-center shadow-card-sm">
      <p class="mb-3 text-[13.5px] text-muted">
        Aucune demande pour l'instant. Complétez votre profil professionnel pour apparaître dans le matching.
      </p>
      <NuxtLink
        to="/prestataire/profil-professionnel"
        class="press inline-block rounded-field border border-hairline bg-white px-4 py-2.5 text-[13.5px] font-semibold text-dark hover:border-primary"
      >
        Compléter mon profil professionnel
      </NuxtLink>
    </div>

    <ul v-else class="flex flex-col gap-3">
      <li
        v-for="item in matches"
        :key="item.request.id"
        class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm"
      >
        <div class="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-[15px] font-bold text-dark">{{ item.request.title }}</p>
            <p class="text-[12.5px] text-muted">{{ formatDate(item.request.createdAt) }}</p>
          </div>
          <div class="shrink-0 rounded-field bg-dark px-2.5 py-1.5 text-center">
            <div class="text-[14px] font-extrabold leading-none text-white">{{ item.score.total }}</div>
            <div class="text-[8.5px] font-semibold uppercase tracking-wide text-white/70">/ 100</div>
          </div>
        </div>

        <p v-if="item.request.description" class="mb-3 text-[13px] leading-relaxed text-muted">
          {{ item.request.description }}
        </p>

        <div class="flex flex-wrap gap-1.5">
          <span v-if="sectorLabel(item.request.sector)" class="rounded-pill bg-primary/10 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
            {{ sectorLabel(item.request.sector) }}
          </span>
          <span class="rounded-pill bg-bg px-2.5 py-1 text-[11.5px] font-semibold text-dark">
            📍 {{ item.request.location }}
          </span>
          <span class="rounded-pill bg-bg px-2.5 py-1 text-[11.5px] font-semibold text-dark">
            💰 {{ formatBudget(item.request.budgetMax) }}
          </span>
          <span class="rounded-pill bg-bg px-2.5 py-1 text-[11.5px] font-semibold text-dark">
            ⏱️ {{ URGENCY_LABELS[item.request.urgency] ?? item.request.urgency }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
