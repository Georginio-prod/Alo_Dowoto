<script setup lang="ts">
/**
 * Aide contextuelle au premier passage (#tutoriel-onboarding — Étape 6).
 *
 * Une bulle courte, affichée **une seule fois** sur un écran complexe (fiche
 * préalable, paiement), au-dessus de la barre d'onglets. Réutilise l'infra de
 * progression (useTutorials) : l'état « vu » est donc synchronisé côté serveur
 * et remis à zéro par « Réinitialiser les tutoriels ». Rendu client-only pour
 * éviter tout décalage d'hydratation.
 */
const props = defineProps<{ hintKey: string; text: string }>()

const { t } = useI18n({ useScope: 'global' })
const tutorials = useTutorials()

const visible = ref(false)
onMounted(() => {
  tutorials.load()
  if (!tutorials.hasSeen(props.hintKey)) visible.value = true
})

function dismiss() {
  tutorials.markSeen(props.hintKey)
  visible.value = false
}
</script>

<template>
  <Transition name="hint">
    <div
      v-if="visible"
      class="fixed inset-x-0 z-50 px-4"
      style="bottom: calc(var(--tabbar-height, 0px) + env(safe-area-inset-bottom) + 0.75rem);"
      role="status"
    >
      <div class="mx-auto flex max-w-md items-start gap-3 rounded-card border border-primary/25 bg-surface p-4 shadow-card-lg">
        <span class="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-lg" aria-hidden="true">💡</span>
        <p class="min-w-0 flex-1 text-[13.5px] leading-relaxed text-dark">{{ text }}</p>
        <button
          type="button"
          class="press shrink-0 self-center rounded-pill bg-primary px-3.5 py-2 text-[13px] font-bold text-white hover:bg-primary-hover"
          @click="dismiss"
        >
          {{ t('hint.gotIt') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.05, 0.7, 0.1, 1);
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
@media (prefers-reduced-motion: reduce) {
  .hint-enter-active,
  .hint-leave-active { transition: opacity 0.1s ease; }
  .hint-enter-from,
  .hint-leave-to { transform: none; }
}
</style>
