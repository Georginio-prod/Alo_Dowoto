<script setup lang="ts">
// Layout du parcours d'onboarding mobile (écrans accueil / connexion /
// vérification). Volontairement nu : aucun AppHeader, AppFooter, bulle
// d'assistance, sélecteur de thème ni widget de perf — ces éléments du site
// web n'ont pas leur place sur les premiers écrans de l'app (parties A et C).
// Le fond noir sert de base pour l'écran vidéo : tant que le poster ou la
// vidéo n'est pas peint, l'utilisateur voit du noir intentionnel, pas un
// rectangle vide clignotant.
</script>

<template>
  <div class="onboarding-shell min-h-[100dvh] bg-black text-ink">
    <slot />
  </div>
</template>

<style scoped>
/* Respect des zones sûres (encoche, barre de gestes) sur les appareils qui les
   exposent. `viewport-fit=cover` est déjà posé côté coquille Capacitor. */
.onboarding-shell {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>

<!-- Transition d'écran (accueil ⇆ connexion), globale car appliquée par Nuxt
     à la racine de la page. Glissement horizontal, courbe d'onboarding. -->
<style>
.ob-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.05, 0.7, 0.1, 1), opacity 0.3s cubic-bezier(0.05, 0.7, 0.1, 1);
}
.ob-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.05, 0.7, 0.1, 1), opacity 0.25s cubic-bezier(0.05, 0.7, 0.1, 1);
}
.ob-slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.ob-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
@media (prefers-reduced-motion: reduce) {
  .ob-slide-enter-active,
  .ob-slide-leave-active {
    transition: none;
  }
  .ob-slide-enter-from,
  .ob-slide-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
