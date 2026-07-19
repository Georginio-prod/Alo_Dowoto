<script setup lang="ts">
/**
 * Édition du profil professionnel prestataire, sur sa propre route (accès
 * direct/marque-page) — le formulaire vit dans ProfessionalProfileForm.vue,
 * réutilisé par la fenêtre ouverte depuis le hub `/profil` (#hub-profil-modales).
 */
definePageMeta({ layout: 'blank', middleware: 'auth', authRole: 'prestataire' })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/profil" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour au profil</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
        <p class="mt-1 text-[13.5px] text-muted">Aidez les chercheurs à mieux vous connaître avant de vous contacter.</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">Profil professionnel</h1>
        <ProfessionalProfileForm />
      </div>
    </div>
  </div>
</template>
