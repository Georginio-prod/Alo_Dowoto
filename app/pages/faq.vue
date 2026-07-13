<script setup lang="ts">
interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Comment trouver un prestataire ?',
    answer: 'Recherchez un secteur depuis la page d\'accueil ou décrivez directement votre besoin, puis comparez les profils vérifiés.',
  },
  {
    question: 'Comment contacter un prestataire ?',
    answer: 'Depuis sa fiche profil ou une carte de résultat, cliquez sur « Contacter » : une conversation s\'ouvre directement avec lui.',
  },
  {
    question: 'Comment devenir prestataire sur WorkTogo ?',
    answer: 'Cliquez sur « Devenir prestataire », créez votre compte, choisissez votre secteur puis votre formule d\'abonnement.',
  },
  {
    question: 'Le contact avec un prestataire est-il gratuit ?',
    answer: 'Chaque compte chercheur dispose d\'un quota de contacts gratuits par mois. Au-delà, patientez jusqu\'au mois suivant.',
  },
  {
    question: 'Comment fonctionne la notation ?',
    answer: 'Une fois la collaboration terminée, chercheur et prestataire peuvent se noter mutuellement depuis le fil de messagerie.',
  },
]

useHead({ title: 'FAQ — WorkTogo' })
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Questions fréquentes</h1>
    <p class="mb-8 text-[14.5px] leading-relaxed text-muted">
      Vous ne trouvez pas votre réponse ? Consultez le
      <NuxtLink to="/aide" class="font-semibold text-primary">centre d'aide</NuxtLink>
      ou <NuxtLink to="/contact" class="font-semibold text-primary">contactez le support</NuxtLink>.
    </p>

    <div class="flex flex-col gap-4">
      <div v-for="item in FAQ_ITEMS" :key="item.question" class="rounded-card border border-hairline bg-surface p-4">
        <h2 class="mb-1.5 text-[14.5px] font-bold text-dark">{{ item.question }}</h2>
        <p class="text-[13.5px] leading-relaxed text-muted">{{ item.answer }}</p>
      </div>
    </div>
  </div>
</template>
