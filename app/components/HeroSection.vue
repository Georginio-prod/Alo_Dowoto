<script setup lang="ts">
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

    <!-- Bandeau de partenaires défilant en continu (boucle sans couture). -->
    <div v-reveal class="partners-marquee mt-6" role="group" aria-label="Ils nous font confiance">
      <div class="partners-track">
        <span v-for="(name, i) in partners" :key="`p-${i}`" class="partner-item">{{ name }}</span>
        <span v-for="(name, i) in partners" :key="`p2-${i}`" class="partner-item" aria-hidden="true">{{ name }}</span>
      </div>
    </div>
  </section>
</template>
