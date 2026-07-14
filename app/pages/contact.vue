<script setup lang="ts">
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '~/data/companyInfo'

useHead({ title: 'Contact — WorkTogo' })

interface ContactReason {
  label: string
  to: string
  description: string
}

const OTHER_REASONS: ContactReason[] = [
  { label: 'Question générale sur le fonctionnement', to: '/faq', description: 'Consultez d\'abord la FAQ — la réponse s\'y trouve souvent instantanément.' },
  { label: 'Problème avec un chercheur ou un prestataire', to: '/reclamation', description: 'Déposez une réclamation détaillée, suivie individuellement par notre équipe.' },
]
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Contacter le support</h1>
    <p class="mb-6 text-[14.5px] leading-relaxed text-muted">
      Pour un problème technique, une question sur votre compte ou votre abonnement, notre équipe vous répond par
      email ou téléphone ci-dessous.
    </p>

    <div class="mb-6 flex flex-col gap-3">
      <a :href="`mailto:${SUPPORT_EMAIL}`" class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 hover:border-primary/40">
        <span class="text-[13.5px] font-semibold text-dark">Email</span>
        <span class="text-[13.5px] text-primary">{{ SUPPORT_EMAIL }}</span>
      </a>
      <a :href="`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`" class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 hover:border-primary/40">
        <span class="text-[13.5px] font-semibold text-dark">Téléphone</span>
        <span class="text-[13.5px] text-primary">{{ SUPPORT_PHONE }}</span>
      </a>
    </div>

    <p class="mb-8 text-[12.5px] leading-relaxed text-muted">
      Support disponible du lundi au vendredi, 8h – 18h, et le samedi, 9h – 13h (heure de Lomé). Réponse par email
      sous 48h ouvrées en moyenne.
    </p>

    <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">Autre besoin ?</h2>
    <div class="flex flex-col gap-3">
      <NuxtLink
        v-for="reason in OTHER_REASONS"
        :key="reason.to"
        :to="reason.to"
        class="press rounded-card border border-hairline bg-surface p-4 hover:border-primary/40"
      >
        <div class="mb-1 text-[13.5px] font-bold text-dark">{{ reason.label }}</div>
        <p class="text-[13px] text-muted">{{ reason.description }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
