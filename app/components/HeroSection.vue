<template>
  <section class="relative mx-auto max-w-6xl overflow-hidden px-6 pb-4 pt-16 text-center">
    <div class="hero-glow" />
    <!-- Illustration détourée (fond transparent) : s'intègre à n'importe quel
         thème. WebP prioritaire, PNG détouré en repli. -->
    <picture class="contents">
      <source srcset="/images/hero-illustration-cutout.webp" type="image/webp">
      <img
        v-parallax="0.06"
        src="/images/hero-illustration-cutout.png"
        alt=""
        decoding="async"
        class="float-soft mx-auto mb-6 w-full max-w-md"
      >
    </picture>
    <h1 v-reveal class="mx-auto mb-3 max-w-2xl text-[clamp(26px,4vw,42px)] font-extrabold tracking-tight text-dark">
      Trouvez le bon prestataire, dans tous les secteurs
    </h1>
    <p v-reveal class="mx-auto max-w-lg text-base leading-relaxed text-muted">
      Artisanat, commerce, industrie, services à domicile… Comparez des professionnels vérifiés partout au Togo.
    </p>
    <p v-reveal class="mt-6 text-sm text-muted">
      Plus de <strong class="text-dark"><CountUp :value="500" suffix="+" /></strong> prestataires vérifiés déjà inscrits
    </p>
  </section>
</template>
