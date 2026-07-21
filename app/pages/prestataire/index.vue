<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { ProviderMatchedRequest } from '~~/server/utils/requestStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'

/**
 * « Mon espace » prestataire — accueil du dashboard prestataire, atteint
 * depuis le logo WorkTogo du layout (dashboard-prestataire.vue). Reprend le
 * ton plus chaleureux de la page d'accueil publique (bandeau d'en-tête,
 * gros titre) tout en restant une vraie vue d'ensemble : statut
 * d'abonnement, rappels, stats (demandes, avis, solde, secteur) et un
 * aperçu des demandes reçues les plus récentes, plutôt qu'un simple résumé
 * minimal.
 */

definePageMeta({ layout: 'dashboard-prestataire', middleware: 'auth', authRole: 'prestataire' })

const BADGE_STYLES: Record<string, string> = {
  none: 'bg-white/10 text-white/80',
  pending: 'bg-primary/20 text-primary',
  active: 'bg-primary text-white',
  expired: 'bg-error/20 text-error',
}

const { user } = useSession()
const { data: profileData } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const { data: subscriptionData } = await useFetch<{ subscription: Subscription | null }>('/api/subscriptions/me')
const { data: requestsQuotaData } = await useFetch<{ usage: { count: number; limit: number | null; month: string } }>(
  '/api/quotas/requests-received',
)
const { data: ratingData } = await useFetch<{ rating: { average: number; count: number } }>('/api/reviews/me')
const { data: matchesData } = await useFetch<{ matches: ProviderMatchedRequest[] }>('/api/requests/received')
const { balance, ensure: ensureWallet } = useWallet()
await ensureWallet()

const rating = computed(() => ratingData.value?.rating ?? { average: 0, count: 0 })
const recentMatches = computed(() => (matchesData.value?.matches ?? []).slice(0, 3))

const sectorName = computed(() => {
  const slug = profileData.value?.profile?.sector
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? 'votre activité'
})

function sectorLabel(slug?: string) {
  if (!slug) return null
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? slug
}

// Formule Annuel/Premium = quota illimité (`limit: null`, #63) : affiché
// explicitement plutôt que de laisser deviner une limite numérique.
const requestsUsageLabel = computed(() => {
  const usage = requestsQuotaData.value?.usage
  if (!usage) return '0 / 0'
  return usage.limit === null ? `${usage.count} / Illimité` : `${usage.count} / ${usage.limit}`
})

const formattedBalance = computed(() => (balance.value === null ? '…' : `${balance.value.toLocaleString('fr-FR')} F CFA`))

const subscriptionBadge = computed(() => {
  const status = subscriptionData.value?.subscription?.status
  if (status === 'actif') return { label: 'Abonnement actif', tone: 'active' }
  if (status === 'en_attente') return { label: 'Abonnement en attente de validation', tone: 'pending' }
  if (status === 'expire') return { label: 'Abonnement expiré', tone: 'expired' }
  return { label: 'Profil non abonné', tone: 'none' }
})

// Rappel non intrusif tant que l'abonnement n'est pas actif (#186) : couvre
// aussi bien le compte qui a cliqué « Compléter mon profil plus tard » à
// l'étape Abonnement (aucune formule choisie) que celui dont l'abonnement a
// expiré — dans les deux cas le badge de statut en haut de page n'est pas
// cliquable, donc sans ce bandeau il n'y a plus aucun chemin évident vers
// /abonnement une fois qu'un abonnement a existé au moins une fois. Le hub
// /profil (voir app/pages/profil.vue) couvre la vue d'ensemble complète
// (identité, vérification, profil professionnel, abonnement) ; ce bandeau
// reste ciblé sur l'abonnement spécifiquement, seule étape bloquante pour
// recevoir des demandes.
const subscriptionStatus = computed(() => subscriptionData.value?.subscription?.status ?? null)
const profileIncomplete = computed(() => subscriptionStatus.value === null || subscriptionStatus.value === 'expire')
const subscriptionBannerText = computed(() =>
  subscriptionStatus.value === 'expire'
    ? "Votre abonnement a expiré : renouvelez-le pour continuer à recevoir des demandes."
    : "Votre profil n'est pas complet : choisissez une formule pour profiter de toutes les fonctionnalités.",
)

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function restartDemo() {
  navigateTo('/')
}
</script>

<template>
  <div>
    <div class="relative mb-6 overflow-hidden rounded-card border border-hairline bg-dark p-6 shadow-card-sm sm:p-7">
      <div class="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
      <div class="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">Espace prestataire</p>
          <h1 class="text-[26px] font-extrabold text-white">Bonjour {{ user?.firstName || sectorName }} 👋</h1>
          <p class="mt-1.5 text-[13.5px] text-white/70">
            <span v-if="user?.location">📍 {{ user.location }} · </span>{{ sectorName }}
          </p>
        </div>
        <span class="shrink-0 rounded-pill px-3 py-1.5 text-[12.5px] font-bold" :class="BADGE_STYLES[subscriptionBadge.tone]">
          {{ subscriptionBadge.label }}
        </span>
      </div>
    </div>

    <NuxtLink
      v-if="!user?.verified"
      to="/profil?open=verification"
      class="press mb-4 flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/8 p-4 hover:border-primary/50"
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
        {{ subscriptionBannerText }}
      </p>
      <span class="shrink-0 font-bold text-primary">→</span>
    </NuxtLink>

    <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NuxtLink
        to="/prestataire/demandes"
        class="press rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm hover:border-primary/40"
      >
        <div class="text-[22px] font-extrabold text-dark">{{ requestsUsageLabel }}</div>
        <div class="text-[11.5px] text-muted">Demandes reçues ce mois</div>
      </NuxtLink>
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="text-[22px] font-extrabold text-dark">{{ rating.count > 0 ? rating.average.toFixed(1) : '—' }}</div>
        <div class="text-[11.5px] text-muted">{{ rating.count }} avis</div>
      </div>
      <NuxtLink
        to="/prestataire/solde"
        class="press rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm hover:border-primary/40"
      >
        <div class="truncate text-[18px] font-extrabold text-dark">{{ formattedBalance }}</div>
        <div class="text-[11.5px] text-muted">Solde disponible</div>
      </NuxtLink>
      <div class="rounded-card border border-hairline bg-surface p-4 text-center shadow-card-sm">
        <div class="truncate text-[15px] font-extrabold text-dark">{{ sectorName }}</div>
        <div class="text-[11.5px] text-muted">Secteur d'activité</div>
      </div>
    </div>

    <section v-if="recentMatches.length" class="mb-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-[12px] font-bold uppercase tracking-wide text-muted">Demandes récentes</h2>
        <NuxtLink to="/prestataire/demandes" class="press text-[12.5px] font-semibold text-primary">Voir tout →</NuxtLink>
      </div>
      <ul class="flex flex-col gap-2">
        <li v-for="item in recentMatches" :key="item.request.id">
          <NuxtLink
            to="/prestataire/demandes"
            class="press flex items-center justify-between gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
          >
            <div class="min-w-0">
              <p class="truncate text-[14px] font-semibold text-dark">{{ item.request.title }}</p>
              <p class="text-[12px] text-muted">
                {{ sectorLabel(item.request.sector) }} · {{ item.request.location }} · {{ formatDate(item.request.createdAt) }}
              </p>
            </div>
            <span class="shrink-0 rounded-field bg-dark px-2 py-1 text-[11px] font-bold text-white">{{ item.score.total }}/100</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <p class="mb-6 max-w-[520px] text-[13.5px] leading-relaxed text-muted">
      Complétez votre profil (photo, description, tarifs) pour commencer à recevoir des demandes de clients dans
      les secteurs sélectionnés.
    </p>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <NuxtLink
        to="/profil"
        class="press rounded-card border border-hairline bg-dark p-4 shadow-card-sm hover:bg-dark-hover"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-white/70">Profil</p>
        <p class="text-[13.5px] font-semibold text-white">Compléter mon profil</p>
      </NuxtLink>
      <NuxtLink
        to="/prestataire/solde"
        class="press rounded-card border border-hairline bg-surface p-4 shadow-card-sm hover:border-primary/40"
      >
        <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-primary">Solde</p>
        <p class="text-[13.5px] font-semibold text-dark">Voir mon solde</p>
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
