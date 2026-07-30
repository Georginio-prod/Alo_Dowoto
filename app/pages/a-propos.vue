<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

useHead(() => ({ title: `${t('aPropos.title')} — WorkTogo` }))
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-12">
    <h1 v-reveal class="mb-2 text-2xl font-extrabold text-dark">{{ t('aPropos.title') }}</h1>
    <p v-reveal :style="{ '--reveal-delay': '60ms' }" class="mb-10 max-w-2xl text-[14.5px] leading-relaxed text-muted">
      {{ t('aPropos.intro') }}
    </p>

    <section class="mb-14 grid grid-cols-1 items-center gap-8 sm:grid-cols-2 sm:gap-10">
      <div v-reveal>
        <h2 class="mb-3 text-[16px] font-bold text-dark">{{ t('aPropos.missionHeading') }}</h2>
        <p class="mb-2 text-[13.5px] leading-relaxed text-muted">{{ t('aPropos.missionBody1') }}</p>
        <p class="text-[13.5px] leading-relaxed text-muted">{{ t('aPropos.missionBody2') }}</p>
      </div>
      <div v-reveal :style="{ '--reveal-delay': '80ms' }">
        <picture>
          <source srcset="/images/apropos-photo.webp" type="image/webp">
          <img
            src="/images/apropos-photo.jpg"
            :alt="t('aPropos.missionPhotoAlt')"
            loading="lazy"
            decoding="async"
            width="1200"
            height="800"
            class="w-full rounded-card object-cover shadow-card-md"
          >
        </picture>
      </div>
    </section>

    <section class="grid grid-cols-1 items-center gap-8 sm:grid-cols-2 sm:gap-10">
      <div v-reveal class="order-2 sm:order-1">
        <img
          src="/images/apropos-illustration.svg"
          :alt="t('aPropos.howIllustrationAlt')"
          loading="lazy"
          decoding="async"
          width="800"
          height="417"
          class="mx-auto w-full max-w-sm"
        >
      </div>
      <div v-reveal :style="{ '--reveal-delay': '80ms' }" class="order-1 sm:order-2">
        <h2 class="mb-3 text-[16px] font-bold text-dark">{{ t('aPropos.howHeading') }}</h2>
        <p class="mb-2 text-[13.5px] leading-relaxed text-muted">{{ t('aPropos.howBody1') }}</p>
        <p class="text-[13.5px] leading-relaxed text-muted">{{ t('aPropos.howBody2') }}</p>
      </div>
    </section>
  </div>
</template>
