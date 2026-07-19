<script setup lang="ts">
/**
 * Langues maîtrisées par le prestataire, sur sa propre route (accès
 * direct/marque-page) — le formulaire vit dans LanguagesForm.vue, réutilisé
 * par la fenêtre ouverte depuis le hub `/profil` (#hub-profil-modales).
 */
definePageMeta({ layout: 'blank', middleware: 'auth', authRole: 'prestataire' })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/profil" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour au profil</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
        <p class="mt-1 text-[13.5px] text-muted">Indiquez les langues dans lesquelles vous pouvez échanger avec vos clients.</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">Langues</h1>
        <LanguagesForm />
      </div>
    </div>
  </div>
</template>
