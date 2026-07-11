<script setup lang="ts">
import { SECTORS, type Sector } from '~/data/sectors'

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
    <section class="relative mx-auto max-w-6xl overflow-hidden px-6 pb-4 pt-16 text-center">
      <div class="hero-glow" />
      <img
        v-parallax="0.06"
        src="/images/hero-illustration.png"
        alt=""
        class="float-soft mx-auto mb-6 w-full max-w-md"
      >
      <h1 v-reveal class="mx-auto mb-3 max-w-2xl text-[clamp(26px,4vw,42px)] font-extrabold tracking-tight text-dark">
        Trouvez le bon prestataire, dans tous les secteurs
      </h1>
      <p v-reveal class="mx-auto max-w-lg text-base leading-relaxed text-muted">
        Artisanat, commerce, industrie, services à domicile… Comparez des professionnels vérifiés partout au Togo.
      </p>
      <p v-reveal class="mt-6 text-sm text-muted">
        Plus de <strong class="text-dark"><CountUp :value="500" suffix="+" /></strong> prestataires vérifiés déjà inscrits
      </p>
    </section>

    <section class="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <h2 v-reveal class="mb-4 text-lg font-bold text-dark">Parcourir par secteur</h2>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
        <button
          v-for="(sector, i) in SECTORS"
          :key="sector.slug"
          v-reveal
          type="button"
          :style="{ '--reveal-delay': `${i * 40}ms` }"
          class="lift flex flex-col items-start gap-2.5 rounded-2xl border border-black/[0.08] bg-white p-4 text-left"
          @click="openSectorDrawer(sector)"
        >
          <div
            class="flex h-9 w-9 items-center justify-center rounded-[10px] text-base"
            :style="{ background: sector.color, color: sector.ink }"
          >
            {{ sector.emoji }}
          </div>
          <div class="text-[14.5px] font-semibold leading-tight text-dark">{{ sector.name }}</div>
          <div class="text-xs text-muted">{{ sector.subSectors.length }} sous-secteurs</div>
        </button>
      </div>
    </section>

    <SectorDrawer :sector="activeSector" @close="closeSectorDrawer" @select="onSelectSubSector" />
    <ChoiceModal
      v-if="isChoiceModalOpen"
      :search-term="choiceSearchTerm"
      @cancel="closeChoiceModal"
    />
  </div>
</template>
