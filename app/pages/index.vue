<script setup lang="ts">
import type { Sector } from '~/data/sectors'

const { open: openChoiceModal } = useChoiceModal()
const { user: sessionUser, ensure } = useSession()
await ensure()

// Un prestataire connecté n'a pas d'usage pour la vitrine publique (recherche
// de prestataires) : son "accueil" est son espace de gestion des demandes.
if (sessionUser.value?.role === 'prestataire') {
  await navigateTo('/prestataire')
}

const activeSector = ref<Sector | null>(null)

function openSectorDrawer(sector: Sector) {
  activeSector.value = sector
}

function closeSectorDrawer() {
  activeSector.value = null
}

function onSelectSubSector(name: string) {
  activeSector.value = null

  // Déjà connecté en tant que chercheur : la modale de choix de compte n'a
  // plus lieu d'être, on va directement aux résultats du sous-secteur
  // (même destination que la modale via `/auth`, voir auth.vue#onSignupPasswordSuccess).
  if (sessionUser.value?.role === 'client') {
    navigateTo({ path: '/resultats', query: { q: name } })
    return
  }

  openChoiceModal(name)
}
</script>

<template>
  <div>
    <HeroSection />
    <SectorGrid @select="openSectorDrawer" @select-sub="(_sector, name) => onSelectSubSector(name)" />
    <HowItWorks />
    <ReassuranceBar />
    <PricingTeaser />
    <TestimonialsSection />
    <SectorDrawer :sector="activeSector" @close="closeSectorDrawer" @select="onSelectSubSector" />
  </div>
</template>
