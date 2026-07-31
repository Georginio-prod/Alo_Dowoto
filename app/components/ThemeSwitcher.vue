<script setup lang="ts">
// Bouton flottant qui bascule Clair → WhatsApp → Darkmatter → Northern Lights
// → Harbor Steel → Clair. Utilise les tokens (bg-surface, text-muted…) donc il
// s'adapte automatiquement au thème courant.
const { current, cycle } = useTheme()

const { t } = useI18n({ useScope: 'global' })

/** Libellés traduits (#i18n) par id de thème — `current.label` (useTheme.ts) reste la valeur français par défaut, hors contexte vue-i18n. */
const THEME_LABEL_KEYS: Record<string, string> = {
  clair: 'themeSwitcher.lightLabel',
  northern: 'themeSwitcher.northernLabel',
}
const currentLabel = computed(() => {
  const key = THEME_LABEL_KEYS[current.value.id]
  return key ? t(key) : current.value.label
})
</script>

<template>
  <!--
    Ancré en bas à *gauche* : en bas à droite, il se superposait exactement au
    bouton « Envoyer le message » de la messagerie et interceptait le clic —
    impossible d'envoyer un message autrement qu'avec la touche Entrée. Le coin
    bas droit reste réservé à la bulle de l'assistant et aux barres d'action des
    pages (voir /abonnement).
  -->
  <button
    type="button"
    class="press fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-pill border border-hairline bg-surface px-3.5 py-2 text-[13px] font-semibold text-muted shadow-card-md hover:text-dark"
    :aria-label="t('themeSwitcher.ariaLabel', { label: currentLabel })"
    :title="t('themeSwitcher.titleAttr', { label: currentLabel })"
    @click="cycle"
  >
    <span
      class="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
      :style="{ backgroundColor: current.dot }"
    />
    <span class="whitespace-nowrap">{{ currentLabel }}</span>
  </button>
</template>
