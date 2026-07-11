<script setup lang="ts">
import type { Sector } from '~/data/sectors'

const activeSector = ref<Sector | null>(null)
const choiceSearchTerm = ref<string | null>(null)
const isChoiceModalOpen = ref(false)

function openSectorDrawer(sector: Sector) {
  activeSector.value = sector
}

function closeSectorDrawer() {
  activeSector.value = null
}

function onSelectSubSector(name: string) {
  activeSector.value = null
  choiceSearchTerm.value = name
  isChoiceModalOpen.value = true
}

function closeChoiceModal() {
  isChoiceModalOpen.value = false
}
</script>

<template>
  <div>
    <HeroSection />
    <SectorGrid @select="openSectorDrawer" />
    <HowItWorks />
    <SectorDrawer :sector="activeSector" @close="closeSectorDrawer" @select="onSelectSubSector" />
    <ChoiceModal
      v-if="isChoiceModalOpen"
      :search-term="choiceSearchTerm"
      @cancel="closeChoiceModal"
    />
  </div>
</template>
