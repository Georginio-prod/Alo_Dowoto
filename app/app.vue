<script setup lang="ts">
import { COMPANY_NAME } from '~/data/companyInfo'

// Données structurées JSON-LD (#358, SEO) : Organization + WebSite, injectées
// sur toutes les pages. L'origine est déduite de la requête (useRequestURL)
// pour rester correcte en dev/preview/prod sans domaine codé en dur.
const origin = useRequestURL().origin
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: COMPANY_NAME,
            url: origin,
            description:
              'Place de marché de services au Togo : mise en relation entre clients et prestataires vérifiés, avec paiement sécurisé en séquestre.',
            areaServed: 'TG',
          },
          {
            '@type': 'WebSite',
            name: COMPANY_NAME,
            url: origin,
            inLanguage: 'fr',
            potentialAction: {
              '@type': 'SearchAction',
              target: `${origin}/resultats?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Montée une seule fois au niveau racine pour apparaître sur toutes les pages (#225). -->
    <FavoritesMessagingBar />
    <!-- Bouton de bascule de thème, présent sur toutes les pages. -->
    <ThemeSwitcher />
  </div>
</template>
