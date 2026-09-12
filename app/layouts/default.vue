<script setup lang="ts">
const { isOpen, searchTerm, close } = useChoiceModal()
const { enabled: subscriptionEnabled } = useSubscriptionFeature()
</script>

<template>
  <div class="min-h-screen bg-bg text-ink">
    <AppHeader />

    <main>
      <slot />
    </main>

    <AppFooter />

    <ChoiceModal v-if="isOpen" :search-term="searchTerm" :subscription-enabled="subscriptionEnabled" @cancel="close" />
  </div>
</template>
