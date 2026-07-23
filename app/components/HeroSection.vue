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
    <h1 v-reveal class="mx-auto mb-3 max-w-3xl text-[clamp(30px,5.2vw,52px)] font-extrabold leading-[1.08] tracking-tight text-dark">
      Trouvez le <span class="hero-highlight">bon prestataire</span>, dans tous les secteurs
    </h1>
    <p v-reveal :style="{ '--reveal-delay': '80ms' }" class="mx-auto max-w-lg text-base leading-relaxed text-muted">
      Artisanat, commerce, industrie, services à domicile… Comparez des professionnels vérifiés partout au Togo.
    </p>
    <p v-reveal :style="{ '--reveal-delay': '160ms' }" class="mt-6 text-sm text-muted">
      Plus de <strong class="text-dark"><CountUp :value="500" suffix="+" /></strong> prestataires vérifiés déjà inscrits
    </p>

    <!-- Appel à l'action principal (#362) : le hero n'en avait aucun. Le lien
         d'ancre défile en douceur vers la grille des secteurs (`#secteurs`),
         point d'entrée existant du parcours — aucune logique nouvelle. -->
    <div v-reveal :style="{ '--reveal-delay': '220ms' }" class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <a
        href="#secteurs"
        class="press inline-flex items-center gap-2 rounded-pill bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-card-md transition-colors hover:bg-primary-hover"
      >
        Trouver un prestataire
        <span aria-hidden="true">→</span>
      </a>
      <NuxtLink to="/formules" class="press link-underline text-sm font-medium text-muted">
        Vous êtes prestataire ? Voir les formules
      </NuxtLink>
    </div>

    <!-- Bandeau de partenaires défilant en continu (boucle sans couture). -->
    <p v-reveal :style="{ '--reveal-delay': '240ms' }" class="partners-label mt-10">Ils nous font confiance</p>
    <div v-reveal :style="{ '--reveal-delay': '300ms' }" class="partners-marquee mt-4" role="group" aria-label="Ils nous font confiance">
      <div class="partners-track">
        <span v-for="(name, i) in partners" :key="`p-${i}`" class="partner-item">{{ name }}</span>
        <span v-for="(name, i) in partners" :key="`p2-${i}`" class="partner-item" aria-hidden="true">{{ name }}</span>
      </div>
    </div>
  </section>
</template>
