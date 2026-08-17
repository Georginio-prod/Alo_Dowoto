<script setup lang="ts">
/** Étiquette de statut colorée (#dashboard-admin) — tons cohérents avec la charte (main.css). */
const props = withDefaults(defineProps<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }>(), { tone: 'neutral' })

const TONE_CLASSES: Record<string, string> = {
  neutral: 'bg-bg text-muted',
  success: 'bg-primary/10 text-primary',
  warning: 'bg-star/15 text-[#8a6100]',
  danger: 'bg-error/10 text-error',
  info: 'bg-dark/5 text-dark',
}

const classes = computed(() => TONE_CLASSES[props.tone])
</script>

<template>
  <span class="inline-flex items-center rounded-pill px-2.5 py-1 text-[11px] font-semibold" :class="classes">
    <slot />
  </span>
</template>
