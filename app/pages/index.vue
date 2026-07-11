<script setup lang="ts">
import type { Sector } from '~/data/sectors'

const activeSector = ref<Sector | null>(null)

function openSectorDrawer(sector: Sector) {
  activeSector.value = sector
}

function closeSectorDrawer() {
  activeSector.value = null
}

function onSelectSubSector() {
  closeSectorDrawer()
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
