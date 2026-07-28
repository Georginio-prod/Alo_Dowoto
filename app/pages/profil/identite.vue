<script setup lang="ts">
/** Édition de l'identité, sur sa propre route (accès direct/marque-page) — le formulaire vit dans IdentiteForm.vue, réutilisé par la fenêtre ouverte depuis /profil (#hub-profil-modales). */
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/profil" class="press mb-2 inline-block py-2 text-sm text-muted">{{ t('profilIdentite.back') }}</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
        <p class="mt-1 text-[13.5px] text-muted">{{ t('profilIdentite.subtitle') }}</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">{{ t('profilIdentite.heading') }}</h1>
        <IdentiteForm />
      </div>
    </div>
  </div>
</template>
