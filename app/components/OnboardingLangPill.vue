<script setup lang="ts">
/**
 * Pastille de langue de l'écran d'accueil (partie A). Contour blanc
 * semi-transparent pour rester lisible par-dessus la vidéo. Affiche la langue
 * active et bascule réellement FR ⇄ EN au tap (pas décorative, partie F) —
 * même mécanisme que LanguageSwitcher, habillage adapté au fond sombre.
 */
const { locale, locales, setLocale, t } = useI18n({ useScope: 'global' })

const otherLocale = computed(() => {
  const list = locales.value as Array<{ code: 'fr' | 'en'; name?: string }>
  return list.find((l) => l.code !== locale.value)
})

function toggle() {
  if (otherLocale.value) setLocale(otherLocale.value.code)
}
</script>

<template>
  <button
    type="button"
    class="press inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-pill border border-white/50 px-3 text-[13px] font-bold uppercase text-white"
    :aria-label="otherLocale ? t('language.switchTo', { name: otherLocale.name }) : t('onboarding.langPillAria')"
    :title="otherLocale ? t('language.switchTo', { name: otherLocale.name }) : ''"
    @click="toggle"
  >
    {{ locale.toUpperCase() }}
  </button>
</template>
