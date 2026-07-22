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

// `alias` : rend cette page également accessible sous /prestataire/accueil
// (lien utilisé par la nav du dashboard, voir dashboard-prestataire.vue) sans
// dupliquer le composant — /prestataire tout court reste valide pour les
// redirections externes existantes (connexion, callback Google…).
definePageMeta({ layout: 'dashboard-prestataire', middleware: 'auth', authRole: 'prestataire', alias: '/prestataire/accueil' })

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

// Complétude du profil (levier Upwork/Malt) : un score chiffré + une checklist
// des éléments manquants incitent à enrichir la fiche, ce qui la rend plus
// crédible et attire davantage de demandes. Calculé côté client à partir du
// profil déjà chargé (/api/providers/me) — aucune requête supplémentaire,
// aucune donnée inventée. Chaque item pèse identiquement et pointe vers la
// sous-page où le compléter.
interface ChecklistItem {
  key: string
  label: string
  done: boolean
  to: string
}
const profileChecklist = computed<ChecklistItem[]>(() => {
  const p = profileData.value?.profile
  return [
    { key: 'photo', label: 'Photo de profil', done: !!p?.photoUrl, to: '/prestataire/profil-professionnel' },
    { key: 'description', label: 'Description', done: !!p?.description, to: '/prestataire/profil-professionnel' },
    { key: 'rate', label: 'Tarif de base', done: (p?.rateFrom ?? 0) > 0, to: '/prestataire/profil-professionnel' },
    { key: 'cv', label: 'CV', done: !!p?.cvUrl, to: '/prestataire/cv' },
    { key: 'languages', label: 'Langues', done: !!p?.languages?.length, to: '/prestataire/langues' },
    { key: 'formation', label: 'Formation', done: !!p?.formations?.length, to: '/prestataire/formation' },
    { key: 'certifications', label: 'Certifications', done: !!p?.certifications?.length, to: '/prestataire/certifications' },
    { key: 'verified', label: 'Identité vérifiée', done: !!user.value?.verified, to: '/prestataire/profil?open=verification' },
  ]
})
const completionPercent = computed(() => {
  const items = profileChecklist.value
  return Math.round((items.filter((i) => i.done).length / items.length) * 100)
})
const missingProfileItems = computed(() => profileChecklist.value.filter((i) => !i.done))

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

    <!-- Jauge de complétude du profil (levier de qualité, style Upwork/Malt). -->
    <section class="mb-6 rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-[14px] font-bold text-dark">Complétude de votre profil</h2>
          <p class="text-[12.5px] text-muted">Un profil complet inspire confiance et attire plus de demandes.</p>
        </div>
        <span class="shrink-0 text-[22px] font-extrabold text-primary">{{ completionPercent }}%</span>
      </div>
      <div class="mb-3 h-2 overflow-hidden rounded-pill bg-bg">
        <div
          class="h-full rounded-pill bg-primary transition-[width] duration-500 ease-out"
          :style="{ width: `${completionPercent}%` }"
        />
      </div>
      <div v-if="missingProfileItems.length" class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="item in missingProfileItems"
          :key="item.key"
          :to="item.to"
          class="press inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-white px-3 py-1 text-[12.5px] font-semibold text-muted hover:border-primary/40 hover:text-dark"
        >
          <span aria-hidden="true" class="font-bold text-primary">+</span> {{ item.label }}
        </NuxtLink>
      </div>
      <p v-else class="text-[13px] font-semibold text-primary">✓ Votre profil est complet. Excellent&nbsp;!</p>
    </section>

    <NuxtLink
      v-if="!user?.verified"
      to="/prestataire/profil?open=verification"
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

    <!--
      Zone « Demandes récentes » toujours présente (aperçu de l'activité, comme
      le tableau de bord freelance d'Upwork) : liste si des correspondances
      existent, sinon état vide actionnable qui guide vers la complétion du
      profil professionnel — reprend l'intention de l'ancien paragraphe
      statique (supprimé car non cliquable), mais rendue actionnable et
      contextuelle. Les anciennes cartes « Profil / Solde / Messages » ont été
      retirées : elles doublonnaient exactement la barre latérale (mêmes
      destinations), sans rien apporter de plus.
    -->
    <section class="mb-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-[12px] font-bold uppercase tracking-wide text-muted">Demandes récentes</h2>
        <NuxtLink to="/prestataire/demandes" class="press text-[12.5px] font-semibold text-primary">Voir tout →</NuxtLink>
      </div>
      <ul v-if="recentMatches.length" class="flex flex-col gap-2">
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
      <div v-else class="rounded-card border border-hairline bg-surface p-5 text-center shadow-card-sm">
        <p class="text-[13px] leading-relaxed text-muted">
          Aucune demande pour l'instant. Complétez votre profil professionnel (photo, description, tarifs) pour
          apparaître dans le matching des clients de vos secteurs.
        </p>
        <NuxtLink
          to="/prestataire/profil-professionnel"
          class="press mt-3 inline-block rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-dark hover:border-primary/50"
        >
          Compléter mon profil professionnel
        </NuxtLink>
      </div>
    </section>

    <button type="button" class="press mt-1 text-[13px] font-semibold text-muted hover:text-dark" @click="restartDemo">
      ↺ Recommencer la démo
    </button>
  </div>
</template>
