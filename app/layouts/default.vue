<script setup lang="ts">
const { isOpen, searchTerm, close } = useChoiceModal()
// Réserve l'espace de la barre d'onglets mobile (MobileTabBar) quand un
// utilisateur est connecté, pour que le footer et le contenu ne passent pas
// dessous. Sur ≥ lg la barre est masquée : aucune réserve d'espace.
const { user } = useSession()
</script>

<template>
  <div
    class="min-h-screen bg-bg text-ink"
    :class="user ? 'pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0' : ''"
  >
    <AppHeader />

    <main>
      <slot />
    </main>

    <AppFooter />

    <ChoiceModal v-if="isOpen" :search-term="searchTerm" @cancel="close" />
    <MobileTabBar />
  </div>
</template>
