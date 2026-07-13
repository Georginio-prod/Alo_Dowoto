<script setup lang="ts">
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '~/data/companyInfo'

useHead({ title: 'Contact — WorkTogo' })
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Contacter le support</h1>
    <p class="mb-8 text-[14.5px] leading-relaxed text-muted">
      Une question, un problème sur votre compte ? Notre équipe vous répond via les canaux ci-dessous, ou déposez
      une <NuxtLink to="/reclamation" class="font-semibold text-primary">réclamation</NuxtLink>.
    </p>

    <div class="flex flex-col gap-3">
      <a :href="`mailto:${SUPPORT_EMAIL}`" class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 hover:border-primary/40">
        <span class="text-[13.5px] font-semibold text-dark">Email</span>
        <span class="text-[13.5px] text-primary">{{ SUPPORT_EMAIL }}</span>
      </a>
      <a :href="`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`" class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 hover:border-primary/40">
        <span class="text-[13.5px] font-semibold text-dark">Téléphone</span>
        <span class="text-[13.5px] text-primary">{{ SUPPORT_PHONE }}</span>
      </a>
    </div>
  </div>
</template>
