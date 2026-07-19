<script setup lang="ts">
// Bouton flottant qui bascule Clair → WhatsApp → Darkmatter → Northern Lights
// → Harbor Steel → Clair. Utilise les tokens (bg-surface, text-muted…) donc il
// s'adapte automatiquement au thème courant.
const { current, cycle } = useTheme()
</script>

<template>
  <button
    type="button"
    class="press fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-pill border border-hairline bg-surface px-3.5 py-2 text-[13px] font-semibold text-muted shadow-card-md hover:text-dark"
    :aria-label="`Thème : ${current.label}. Cliquer pour changer de thème.`"
    :title="`Thème : ${current.label} — cliquer pour changer`"
    @click="cycle"
  >
    <span
      class="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
      :style="{ backgroundColor: current.dot }"
    />
    <span class="whitespace-nowrap">{{ current.label }}</span>
  </button>
</template>
