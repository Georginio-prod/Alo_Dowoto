<script setup lang="ts">
/**
 * Coche animée de succès affichée à la vérification réussie du code (partie D
 * de l'onboarding) : anneau qui grossit puis trait qui se trace, ~400 ms, en
 * plein écran, avant le passage à l'écran suivant. Respecte « Réduire les
 * animations » (état final immédiat).
 */
defineProps<{ show: boolean; label: string }>()
</script>

<template>
  <Transition name="ob-success">
    <div v-if="show" class="ob-success-overlay" role="status" :aria-label="label">
      <svg viewBox="0 0 52 52" class="size-20" aria-hidden="true">
        <circle cx="26" cy="26" r="24" fill="none" stroke="var(--color-primary)" stroke-width="3" class="ob-success-ring" />
        <path d="M16 27l7 7 13-14" fill="none" stroke="var(--color-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="ob-success-tick" />
      </svg>
    </div>
  </Transition>
</template>

<style scoped>
.ob-success-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  z-index: 50;
}
.ob-success-enter-active,
.ob-success-leave-active {
  transition: opacity 0.2s ease;
}
.ob-success-enter-from,
.ob-success-leave-to {
  opacity: 0;
}
.ob-success-ring {
  transform-origin: center;
  animation: ob-ring 0.4s ease-out both;
}
.ob-success-tick {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: ob-tick 0.4s 0.15s ease-out forwards;
}
@keyframes ob-ring {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes ob-tick {
  to { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .ob-success-ring,
  .ob-success-tick {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
