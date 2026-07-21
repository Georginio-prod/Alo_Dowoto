<script setup lang="ts">
/**
 * Certification des aptitudes du prestataire, sur sa propre route (accès
 * direct/marque-page) — le formulaire vit dans CertificationsForm.vue,
 * réutilisé par la fenêtre ouverte depuis le hub `/profil` (#hub-profil-modales).
 */
definePageMeta({ layout: 'dashboard-prestataire', middleware: 'auth', authRole: 'prestataire' })
</script>

<template>
  <div>
    <NuxtLink to="/prestataire/profil" class="press mb-4 inline-block text-[13px] font-semibold text-muted hover:text-dark">← Retour au profil</NuxtLink>

    <div class="mb-6">
      <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">Espace prestataire</p>
      <h1 class="text-[21px] font-extrabold text-dark">Certifications</h1>
      <p class="mt-1 text-[13px] text-muted">Déposez vos diplômes et attestations pour faire certifier vos compétences.</p>
    </div>

    <div class="max-w-[520px] rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
      <CertificationsForm />
    </div>
  </div>
</template>
