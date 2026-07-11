<script setup lang="ts">
const { isOpen, searchTerm, close } = useChoiceModal()
</script>

<template>
  <div class="min-h-screen bg-bg text-ink">
    <AppHeader />

    <main>
      <slot />
    </main>

    <AppFooter />

    <ChoiceModal v-if="isOpen" :search-term="searchTerm" @cancel="close" />
  </div>
</template>
