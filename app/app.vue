<script setup lang="ts">
import { COMPANY_NAME } from '~/data/companyInfo'

const { locale } = useI18n({ useScope: 'global' })

// Session résolue au niveau racine pour que la barre d'onglets globale
// (MobileTabBar, montée ci-dessous) connaisse le rôle sur toutes les pages,
// y compris publiques — `ensure()` ne refait pas la requête si déjà chargée.
const { ensure } = useSession()
onMounted(() => { ensure() })

// `<html lang>` dynamique selon la langue active (#364) — remplace le
// `lang="fr"` figé dans nuxt.config.ts (#343). `seo: false` : pas de liens
// hreflang alternates, sans objet en stratégie `no_prefix` (même URL pour
// toutes les langues, rien à distinguer entre elles).
const localeHead = useLocaleHead({ seo: false })
useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
}))

// Données structurées JSON-LD (#358, SEO) : Organization + WebSite, injectées
// sur toutes les pages. L'origine est déduite de la requête (useRequestURL)
// pour rester correcte en dev/preview/prod sans domaine codé en dur.
const origin = useRequestURL().origin
useHead(() => ({
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
            inLanguage: locale.value,
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
}))
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Barre d'onglets mobile persistante (#refonte-tabbar) : montée ici, au
         niveau racine, elle reste présente sur toutes les pages de l'app quel
         que soit leur layout — elle ne disparaît plus en ouvrant Messages,
         Solde, Profil… Masquée sur desktop (≥ lg) et hors session via ses
         propres gardes internes. -->
    <MobileTabBar />
    <!-- Montée une seule fois au niveau racine pour apparaître sur toutes les pages (#225). -->
    <FavoritesMessagingBar />
    <!-- Bouton de bascule de thème, présent sur toutes les pages. -->
    <ThemeSwitcher />
    <!-- Assistant IA (#geoloc), accessible depuis toutes les interfaces. -->
    <AssistantWidget />
  </div>
</template>
