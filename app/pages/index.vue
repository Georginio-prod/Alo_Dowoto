<script setup lang="ts">
import type { Sector } from '~/data/sectors'

const { open: openChoiceModal } = useChoiceModal()

const activeSector = ref<Sector | null>(null)

function openSectorDrawer(sector: Sector) {
  activeSector.value = sector
}

function closeSectorDrawer() {
  activeSector.value = null
}

function onSelectSubSector(name: string) {
  activeSector.value = null
  openChoiceModal(name)
}
</script>

<template>
  <div>
    <HeroSection />
    <SectorGrid @select="openSectorDrawer" />
    <HowItWorks />
    <SectorDrawer :sector="activeSector" @close="closeSectorDrawer" @select="onSelectSubSector" />
  </div>
</template>
