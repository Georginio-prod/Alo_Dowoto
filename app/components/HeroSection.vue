<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

// Noms de partenaires — PLACEHOLDER inventés, À REMPLACER par les vrais
// partenaires. Défilent en continu sous l'accroche (bandeau de confiance).
const partners = [
  'Kara Bâtiment',
  'Lomé Digital',
  'Baobab Services',
  'Zeni Group',
  'Palmeraie Immo',
  'Sokodé Artisans',
  'Éco Maison',
  'Atlantic Pro',
]
</script>

<template>
  <section class="relative mx-auto max-w-6xl overflow-hidden px-6 pb-4 pt-16 text-center">
    <div class="hero-glow" />
    <!--
      WebP servi en priorité (≈27 Ko contre ≈1,3 Mo pour le PNG source),
      PNG conservé en repli pour les rares navigateurs sans WebP. Le
      <picture> est en `display:contents` : il ne crée aucune boîte, donc la
      mise en page de l'<img> (centrage, largeur) reste strictement identique.
    -->
    <picture class="contents">
      <source srcset="/images/hero-illustration.webp" type="image/webp">
      <img
        v-parallax="0.06"
        src="/images/hero-illustration.png"
        alt=""
        decoding="async"
        class="float-soft mx-auto mb-6 w-full max-w-md"
      >
    </picture>
    <i18n-t
      v-reveal
      keypath="home.hero.title"
      tag="h1"
      class="mx-auto mb-3 max-w-3xl text-[clamp(30px,5.2vw,52px)] font-extrabold leading-[1.08] tracking-tight text-dark"
    >
      <template #highlight><span class="hero-highlight">{{ t('home.hero.titleHighlight') }}</span></template>
    </i18n-t>
    <p v-reveal :style="{ '--reveal-delay': '80ms' }" class="mx-auto max-w-lg text-base leading-relaxed text-muted">
      {{ t('home.hero.subtitle') }}
    </p>
    <p v-reveal :style="{ '--reveal-delay': '160ms' }" class="mt-6 text-sm text-muted">
      {{ t('home.hero.providerCountPrefix') }} <strong class="text-dark"><CountUp :value="500" suffix="+" /></strong> {{ t('home.hero.providerCountSuffix') }}
    </p>

    <!-- Appel à l'action principal (#362) : le hero n'en avait aucun. Le lien
         d'ancre défile en douceur vers la grille des secteurs (`#secteurs`),
         point d'entrée existant du parcours — aucune logique nouvelle. -->
    <div v-reveal :style="{ '--reveal-delay': '220ms' }" class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <a
        href="#secteurs"
        class="press inline-flex items-center gap-2 rounded-pill bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-card-md transition-colors hover:bg-primary-hover"
      >
        {{ t('home.hero.ctaFind') }}
        <span aria-hidden="true">→</span>
      </a>
      <NuxtLink to="/formules" class="press link-underline text-sm font-medium text-muted">
        {{ t('home.hero.ctaProvider') }}
      </NuxtLink>
    </div>

    <!-- Bandeau de partenaires défilant en continu (boucle sans couture). -->
    <p v-reveal :style="{ '--reveal-delay': '240ms' }" class="partners-label mt-10">{{ t('home.hero.trustLabel') }}</p>
    <div v-reveal :style="{ '--reveal-delay': '300ms' }" class="partners-marquee mt-4" role="group" :aria-label="t('home.hero.trustLabel')">
      <div class="partners-track">
        <span v-for="(name, i) in partners" :key="`p-${i}`" class="partner-item">{{ name }}</span>
        <span v-for="(name, i) in partners" :key="`p2-${i}`" class="partner-item" aria-hidden="true">{{ name }}</span>
      </div>
    </div>
  </section>
</template>
