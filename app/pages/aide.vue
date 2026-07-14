<script setup lang="ts">
useHead({ title: 'Centre d\'aide — WorkTogo' })

interface HelpLink {
  to: string
  title: string
  description: string
}

interface HelpCategory {
  title: string
  links: HelpLink[]
}

const CATEGORIES: HelpCategory[] = [
  {
    title: 'Débuter sur WorkTogo',
    links: [
      { to: '/auth', title: 'Créer un compte ou se connecter', description: 'Inscription par numéro de téléphone ou email, vérifié par code.' },
      { to: '/categories', title: 'Découvrir les secteurs disponibles', description: 'Artisanat, informatique, ménage, beauté, événementiel et bien d\'autres.' },
      { to: '/faq#chercheurs', title: 'Comment fonctionne la recherche de prestataire', description: 'Comparer les profils, contacter, collaborer.' },
    ],
  },
  {
    title: 'Chercheurs',
    links: [
      { to: '/demande', title: 'Publier une demande précise', description: 'Décrivez votre besoin, WorkTogo vous propose les meilleurs profils.' },
      { to: '/favoris', title: 'Retrouver mes prestataires favoris', description: 'Les profils que vous avez enregistrés pour plus tard.' },
      { to: '/messages', title: 'Mes messages', description: 'Vos conversations avec les prestataires contactés.' },
      { to: '/faq#chercheurs', title: 'Toutes les questions chercheurs', description: 'Quota de contacts, notation, favoris…' },
    ],
  },
  {
    title: 'Prestataires',
    links: [
      { to: '/auth?role=prestataire', title: 'Devenir prestataire', description: 'Créez votre profil et choisissez votre secteur d\'activité.' },
      { to: '/abonnement', title: 'Formules et tarifs', description: 'Comparez les formules Mensuel, Trimestriel et Annuel.' },
      { to: '/prestataire', title: 'Mon espace prestataire', description: 'Demandes reçues, avis, statut de votre abonnement.' },
      { to: '/faq#prestataires', title: 'Toutes les questions prestataires', description: 'Badge « Vérifié », quotas de demandes, paiement…' },
    ],
  },
  {
    title: 'Compte et paramètres',
    links: [
      { to: '/profil', title: 'Modifier mon profil', description: 'Nom d\'utilisateur, prénom, nom, localisation.' },
      { to: '/mot-de-passe', title: 'Changer mon mot de passe', description: 'Votre mot de passe actuel vous sera demandé par sécurité.' },
      { to: '/faq#compte', title: 'Compte et sécurité — questions fréquentes', description: 'Mot de passe oublié, changer de compte, suppression…' },
      { to: '/faq#confidentialite', title: 'Confidentialité de mes données', description: 'Ce que WorkTogo fait — et ne fait pas — avec vos informations.' },
    ],
  },
  {
    title: 'Assistance',
    links: [
      { to: '/faq', title: 'Questions fréquentes', description: 'Les réponses aux questions les plus posées sur WorkTogo.' },
      { to: '/contact', title: 'Contacter le support', description: 'Écrivez-nous par email ou par téléphone.' },
      { to: '/reclamation', title: 'Déposer une réclamation', description: 'Signalez un problème rencontré avec un chercheur ou un prestataire.' },
    ],
  },
]
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Centre d'aide</h1>
    <p class="mb-9 text-[14.5px] leading-relaxed text-muted">
      Des guides pour comprendre chaque fonctionnalité de WorkTogo, classés par thème. Vous ne trouvez pas ce que
      vous cherchez ? <NuxtLink to="/contact" class="font-semibold text-primary">Contactez notre équipe</NuxtLink>.
    </p>

    <div class="flex flex-col gap-9">
      <section v-for="category in CATEGORIES" :key="category.title">
        <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">{{ category.title }}</h2>
        <div class="flex flex-col gap-3">
          <NuxtLink
            v-for="link in category.links"
            :key="link.to"
            :to="link.to"
            class="press rounded-card border border-hairline bg-surface p-4 hover:border-primary/40"
          >
            <div class="mb-1 text-[14.5px] font-bold text-dark">{{ link.title }}</div>
            <p class="text-[13px] text-muted">{{ link.description }}</p>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
