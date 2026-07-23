<script setup lang="ts">
// Bascule FR ⇄ EN (#364). Un simple bouton à deux états suffit tant que
// seules ces deux langues sont proposées — pas besoin d'un menu déroulant.
const { locale, locales, setLocale, t } = useI18n({ useScope: 'global' })

const otherLocale = computed(() => {
  const list = locales.value as Array<{ code: 'fr' | 'en'; name?: string }>
  return list.find((l) => l.code !== locale.value)
})
</script>

<template>
  <button
    v-if="otherLocale"
    type="button"
    class="press shrink-0 rounded-pill border border-hairline px-3 py-2 text-[13px] font-semibold text-muted hover:text-primary"
    :aria-label="t('language.switchTo', { name: otherLocale.name })"
    :title="t('language.switchTo', { name: otherLocale.name })"
    @click="setLocale(otherLocale.code)"
  >
    {{ otherLocale.code.toUpperCase() }}
  </button>
</template>
