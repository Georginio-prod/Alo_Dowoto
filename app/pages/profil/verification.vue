<script setup lang="ts">
/** Vérification d'identité, extraite du hub `/profil` sous sa propre route dédiée (#180+1). */
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/profil" class="press mb-2 inline-block py-2 text-sm text-muted">{{ t('profilVerification.back') }}</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-1.5 text-lg font-bold text-dark">{{ t('profilVerification.heading') }}</h1>
        <p class="mb-5 text-[13px] leading-relaxed text-muted">
          {{ t('profilVerification.subtitle') }}
        </p>
        <IdentityVerificationForm />
      </div>
    </div>
  </div>
</template>
