<script setup lang="ts">
useHead({ title: 'Centre d\'aide — WorkTogo' })

const LINKS = [
  { to: '/faq', title: 'Questions fréquentes', description: 'Les réponses aux questions les plus posées sur WorkTogo.' },
  { to: '/contact', title: 'Contacter le support', description: 'Écrivez-nous par email ou par téléphone.' },
  { to: '/reclamation', title: 'Déposer une réclamation', description: 'Signalez un problème rencontré avec un chercheur ou un prestataire.' },
  { to: '/messages', title: 'Mes messages', description: 'Retrouvez vos conversations avec les prestataires contactés.' },
]
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Centre d'aide</h1>
    <p class="mb-8 text-[14.5px] leading-relaxed text-muted">
      Retrouvez ici de quoi répondre à vos questions ou joindre notre équipe.
    </p>

    <div class="flex flex-col gap-3">
      <NuxtLink
        v-for="link in LINKS"
        :key="link.to"
        :to="link.to"
        class="press rounded-card border border-hairline bg-surface p-4 hover:border-primary/40"
      >
        <div class="mb-1 text-[14.5px] font-bold text-dark">{{ link.title }}</div>
        <p class="text-[13px] text-muted">{{ link.description }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
