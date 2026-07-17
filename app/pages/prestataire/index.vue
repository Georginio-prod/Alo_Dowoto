<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'

/**
 * « Mon espace » prestataire : mêmes codes visuels que « Mon espace »
 * chercheur (app/pages/dashboard/client.vue), inspirés d'une maquette de
 * référence fournie par l'utilisateur — pour une expérience cohérente
 * entre les deux profils.
 */

definePageMeta({ layout: 'dashboard-prestataire', middleware: 'auth', authRole: 'prestataire' })

const BADGE_STYLES: Record<string, string> = {
  none: 'bg-bg text-muted',
  pending: 'bg-primary/12 text-primary',
  active: 'bg-primary text-white',
  expired: 'bg-error/10 text-error',
}

const { user } = useSession()
const { data: profileData } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const { data: subscriptionData } = await useFetch<{ subscription: Subscription | null }>('/api/subscriptions/me')
const { data: requestsQuotaData } = await useFetch<{ usage: { count: number; limit: number | null; month: string } }>(
  '/api/quotas/requests-received',
)
const { data: ratingData } = await useFetch<{ rating: { average: number; count: number } }>('/api/reviews/me')

const rating = computed(() => ratingData.value?.rating ?? { average: 0, count: 0 })

const sectorName = computed(() => {
  const slug = profileData.value?.profile?.sector
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? 'votre activité'
})

// Formule Annuel/Premium = quota illimité (`limit: null`, #63) : affiché
// explicitement plutôt que de laisser deviner une limite numérique.
const requestsUsageLabel = computed(() => {
  const usage = requestsQuotaData.value?.usage
  if (!usage) return '0 / 0'
  return usage.limit === null ? `${usage.count} / Illimité` : `${usage.count} / ${usage.limit}`
})

const subscriptionBadge = computed(() => {
  const status = subscriptionData.value?.subscription?.status
  if (status === 'actif') return { label: 'Abonnement actif', tone: 'active' }
  if (status === 'en_attente') return { label: 'Abonnement en attente de validation', tone: 'pending' }
  if (status === 'expire') return { label: 'Abonnement expiré', tone: 'expired' }
  return { label: 'Profil non abonné', tone: 'none' }
})

// Rappel non intrusif tant que le profil n'est pas complété à 100 % (#186) :
// un compte qui a cliqué « Compléter mon profil plus tard » à l'étape
// Abonnement n'a pas encore choisi de formule. Le hub /profil (voir
// app/pages/profil.vue) couvre la vue d'ensemble complète (identité,
// vérification, profil professionnel, abonnement) ; ce bandeau reste ciblé
// sur l'abonnement spécifiquement, seule étape bloquante pour recevoir des
// demandes.
const profileIncomplete = computed(() => !subscriptionData.value?.subscription)

function restartDemo() {
  navigateTo('/')
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">Espace prestataire</p>
        <h1 class="text-[21px] font-extrabold text-dark">Bonjour {{ user?.firstName || sectorName }}</h1>
        <p class="mt-1 text-[13px] text-muted">
          <span v-if="user?.location">📍 {{ user.location }} · </span>{{ sectorName }}
        </p>
      </div>
      <span class="shrink-0 rounded-pill px-3 py-1.5 text-[12.5px] font-bold" :class="BADGE_STYLES[subscriptionBadge.tone]">
        {{ subscriptionBadge.label }}
      </span>
    </div>

    <NuxtLink
      v-if="!user?.verified"
      to="/profil"
      class="press mb-6 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
    >
      <p class="text-[13px] font-semibold text-dark">
        Vérifiez votre identité pour pouvoir être contacté par vos premiers clients.
      </p>
      <span class="shrink-0 font-bold text-primary">→</span>
    </NuxtLink>

    <NuxtLink
      v-if="profileIncomplete"
      to="/abonnement"
      class="press mb-6 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
    >
      <p class="text-[13px] font-semibold text-dark">
        Votre profil n'est pas complet : choisissez une formule pour profiter de toutes les fonctionnalités.
      </p>
      <span class="shrink-0 font-bold text-primary">→</span>
    </NuxtLink>

    <div class="mb-6 grid grid-cols-3 gap-3">
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ requestsUsageLabel }}</div>
        <div class="text-[11.5px] text-muted">Demandes reçues ce mois</div>
      </div>
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ rating.count > 0 ? rating.average.toFixed(1) : '—' }}</div>
        <div class="text-[11.5px] text-muted">{{ rating.count }} avis</div>
      </div>
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="truncate text-[15px] font-extrabold text-dark">{{ sectorName }}</div>
        <div class="text-[11.5px] text-muted">Secteur d'activité</div>
      </div>
    </div>

    <p class="mb-6 max-w-[520px] text-[13.5px] leading-relaxed text-muted">
      Complétez votre profil (photo, description, tarifs) pour commencer à recevoir des demandes de clients dans
      les secteurs sélectionnés.
    </p>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NuxtLink
        to="/profil"
        class="press rounded-card border border-hairline bg-dark p-4 shadow-card-sm hover:bg-dark-hover"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-white/70">Profil</p>
        <p class="text-[13.5px] font-semibold text-white">Compléter mon profil</p>
      </NuxtLink>
      <NuxtLink
        to="/messages"
        class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">Messages</p>
        <p class="text-[13.5px] font-semibold text-dark">Voir mes messages</p>
      </NuxtLink>
    </div>

    <button type="button" class="press mt-5 text-[13px] font-semibold text-muted hover:text-dark" @click="restartDemo">
      ↺ Recommencer la démo
    </button>
  </div>
</template>
