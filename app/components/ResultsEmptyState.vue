<script setup lang="ts">
defineEmits<{
  reset: []
}>()
</script>

<template>
  <div class="flex flex-col items-center rounded-card border border-hairline bg-surface px-6 py-16 text-center">
    <div class="mb-4 flex size-14 items-center justify-center rounded-full bg-bg">
      <svg class="size-6 text-muted" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.6" />
        <line x1="12.3" y1="12.3" x2="17" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </div>
    <p class="mb-1 text-[15px] font-bold text-dark">Aucun prestataire trouvé</p>
    <p class="mb-5 text-[13.5px] text-muted">Essayez d'élargir votre recherche ou de réinitialiser les filtres.</p>
    <button
      type="button"
      class="press rounded-field bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
      @click="$emit('reset')"
    >
      Réinitialiser les filtres
    </button>
  </div>
</template>
