<script setup lang="ts">
/**
 * Bandeau de rappel discret (#tutoriel-onboarding — Couche 1).
 *
 * Affiché sur l'accueil lorsque l'utilisateur a choisi « Plus tard » à
 * l'accueil de bienvenue. Rien d'intrusif : une ligne, une action pour ouvrir
 * le tutoriel, une croix pour refermer. Après deux refus il ne revient jamais
 * (géré par le parent via useOnboarding).
 */
const emit = defineEmits<{ open: []; dismiss: [] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="mb-4 flex items-center gap-3 rounded-card border border-hairline bg-primary/5 px-4 py-3">
    <span class="grid size-9 shrink-0 place-items-center rounded-pill bg-primary/15 text-primary" aria-hidden="true">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 16.5h.01" />
      </svg>
    </span>
    <button type="button" class="press min-w-0 flex-1 text-left" @click="emit('open')">
      <span class="block text-sm font-bold text-dark">{{ t('onboarding.bannerTitle') }}</span>
      <span class="block text-xs text-muted">{{ t('onboarding.bannerDuration') }}</span>
    </button>
    <button
      type="button"
      class="press grid size-9 shrink-0 place-items-center rounded-pill text-muted hover:text-dark"
      :aria-label="t('onboarding.bannerDismiss')"
      @click="emit('dismiss')"
    >
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  </div>
</template>
