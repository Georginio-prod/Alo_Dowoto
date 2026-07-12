<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'

definePageMeta({ layout: 'dashboard-prestataire' })

const BADGE_STYLES: Record<string, string> = {
  none: 'bg-bg text-muted',
  pending: 'bg-primary/12 text-primary',
  active: 'bg-primary text-white',
  expired: 'bg-error/10 text-error',
}

const { data: profileData } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const { data: subscriptionData } = await useFetch<{ subscription: Subscription | null }>('/api/subscriptions/me')

const sectorName = computed(() => {
  const slug = profileData.value?.profile?.sector
  return SECTORS.find((sector) => sector.slug === slug)?.name ?? 'votre activité'
})

const subscriptionBadge = computed(() => {
  const status = subscriptionData.value?.subscription?.status
  if (status === 'actif') return { label: 'Abonnement actif', tone: 'active' }
  if (status === 'en_attente') return { label: 'Abonnement en attente de validation', tone: 'pending' }
  if (status === 'expire') return { label: 'Abonnement expiré', tone: 'expired' }
  return { label: 'Profil non abonné', tone: 'none' }
})

// La page de complétion de profil (photo/description/tarifs) n'est pas
// encore développée dans ce lot — bouton posé pour la maquette, sans
// action pour l'instant.
function completeProfile() {}

function restartDemo() {
  navigateTo('/')
}
</script>

<template>
  <div class="flex flex-col items-center rounded-card border border-hairline bg-surface px-6 py-10 text-center">
    <div
      class="mb-4 flex size-20 items-center justify-center rounded-full bg-[repeating-linear-gradient(135deg,#e5e7eb_0_10px,#eef0f2_10px_20px)]"
    >
      <span class="rounded-pill bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white">photo</span>
    </div>

    <h1 class="mb-2 text-[19px] font-bold text-dark">
      Bienvenue sur WorkTogo, {{ sectorName }} !
    </h1>

    <span
      class="mb-4 rounded-pill px-3 py-1 text-[12.5px] font-bold"
      :class="BADGE_STYLES[subscriptionBadge.tone]"
    >
      {{ subscriptionBadge.label }}
    </span>

    <p class="mb-6 max-w-[420px] text-[13.5px] leading-relaxed text-muted">
      Complétez votre profil (photo, description, tarifs) pour commencer à recevoir des demandes de clients dans
      les secteurs sélectionnés.
    </p>

    <button
      type="button"
      class="press mb-2.5 w-full max-w-[320px] rounded-field bg-dark py-3.5 text-[14.5px] font-semibold text-white hover:bg-[#1a3a28]"
      @click="completeProfile"
    >
      Compléter mon profil
    </button>
    <NuxtLink
      to="/messages"
      class="press mb-2.5 w-full max-w-[320px] rounded-field border border-hairline bg-white py-3.5 text-center text-[14.5px] font-semibold text-muted hover:text-dark"
    >
      Voir mes messages
    </NuxtLink>
    <button
      type="button"
      class="press w-full max-w-[320px] rounded-field border border-hairline bg-white py-3.5 text-[14.5px] font-semibold text-muted hover:text-dark"
      @click="restartDemo"
    >
      Recommencer la démo
    </button>
  </div>
</template>
