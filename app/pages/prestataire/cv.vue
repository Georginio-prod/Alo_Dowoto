<script setup lang="ts">
/**
 * Dépôt du CV prestataire, sur sa propre route (accès direct/marque-page) —
 * le formulaire vit dans CvForm.vue, réutilisé par la fenêtre ouverte
 * depuis le hub `/profil` (#hub-profil-modales).
 */
definePageMeta({ layout: 'dashboard-prestataire', middleware: 'auth', authRole: 'prestataire' })

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div>
    <NuxtLink to="/prestataire/profil" class="press mb-4 inline-block text-[13px] font-semibold text-muted hover:text-dark">{{ t('dashboardShared.backToProfile') }}</NuxtLink>

    <div class="mb-6">
      <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{{ t('dashboardShared.providerSpaceLabel') }}</p>
      <h1 class="text-[21px] font-extrabold text-dark">{{ t('prestataireCv.heading') }}</h1>
      <p class="mt-1 text-[13px] text-muted">{{ t('prestataireCv.subtitle') }}</p>
    </div>

    <div class="max-w-[520px] rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
      <CvForm />
    </div>
  </div>
</template>
