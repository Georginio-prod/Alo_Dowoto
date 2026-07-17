<template>
  <section class="relative mx-auto max-w-6xl overflow-hidden px-6 pb-4 pt-16 text-center">
    <div class="hero-glow" />
    <img
      v-parallax="0.06"
      src="/images/hero-illustration.png"
      alt=""
      class="float-soft mx-auto mb-6 w-full max-w-md"
    >
    <h1 v-reveal class="mx-auto mb-3 max-w-2xl text-[clamp(26px,4vw,42px)] font-extrabold tracking-tight text-dark">
      <MagneticText
        text="Trouvez le bon prestataire, dans tous les secteurs"
        hover-text="On s'occupe de tout, vous choisissez."
      />
    </h1>
    <p v-reveal class="mx-auto max-w-lg text-base leading-relaxed text-muted">
      Artisanat, commerce, industrie, services à domicile… Comparez des professionnels vérifiés partout au Togo.
    </p>
    <p v-reveal class="mt-6 text-sm text-muted">
      Plus de <strong class="text-dark"><CountUp :value="500" suffix="+" /></strong> prestataires vérifiés déjà inscrits
    </p>
  </section>
</template>
