<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

useHead(() => ({ title: t('aide.pageTitle') }))

interface HelpLink {
  to: string
  titleKey: string
  descriptionKey: string
}

interface HelpCategory {
  titleKey: string
  links: HelpLink[]
}

const CATEGORIES: HelpCategory[] = [
  {
    titleKey: 'aide.catStart',
    links: [
      { to: '/auth', titleKey: 'aide.catStartLink1Title', descriptionKey: 'aide.catStartLink1Desc' },
      { to: '/categories', titleKey: 'aide.catStartLink2Title', descriptionKey: 'aide.catStartLink2Desc' },
      { to: '/faq#chercheurs', titleKey: 'aide.catStartLink3Title', descriptionKey: 'aide.catStartLink3Desc' },
    ],
  },
  {
    titleKey: 'aide.catClients',
    links: [
      { to: '/demande', titleKey: 'aide.catClientsLink1Title', descriptionKey: 'aide.catClientsLink1Desc' },
      { to: '/favoris', titleKey: 'aide.catClientsLink2Title', descriptionKey: 'aide.catClientsLink2Desc' },
      { to: '/messages', titleKey: 'aide.catClientsLink3Title', descriptionKey: 'aide.catClientsLink3Desc' },
      { to: '/faq#chercheurs', titleKey: 'aide.catClientsLink4Title', descriptionKey: 'aide.catClientsLink4Desc' },
    ],
  },
  {
    titleKey: 'aide.catProviders',
    links: [
      { to: '/auth?role=prestataire', titleKey: 'aide.catProvidersLink1Title', descriptionKey: 'aide.catProvidersLink1Desc' },
      { to: '/formules', titleKey: 'aide.catProvidersLink2Title', descriptionKey: 'aide.catProvidersLink2Desc' },
      { to: '/prestataire', titleKey: 'aide.catProvidersLink3Title', descriptionKey: 'aide.catProvidersLink3Desc' },
      { to: '/faq#prestataires', titleKey: 'aide.catProvidersLink4Title', descriptionKey: 'aide.catProvidersLink4Desc' },
    ],
  },
  {
    titleKey: 'aide.catAccount',
    links: [
      { to: '/profil', titleKey: 'aide.catAccountLink1Title', descriptionKey: 'aide.catAccountLink1Desc' },
      { to: '/mot-de-passe', titleKey: 'aide.catAccountLink2Title', descriptionKey: 'aide.catAccountLink2Desc' },
      { to: '/faq#compte', titleKey: 'aide.catAccountLink3Title', descriptionKey: 'aide.catAccountLink3Desc' },
      { to: '/faq#confidentialite', titleKey: 'aide.catAccountLink4Title', descriptionKey: 'aide.catAccountLink4Desc' },
    ],
  },
  {
    titleKey: 'aide.catHelp',
    links: [
      { to: '/faq', titleKey: 'aide.catHelpLink1Title', descriptionKey: 'aide.catHelpLink1Desc' },
      { to: '/contact', titleKey: 'aide.catHelpLink2Title', descriptionKey: 'aide.catHelpLink2Desc' },
      { to: '/reclamation', titleKey: 'aide.catHelpLink3Title', descriptionKey: 'aide.catHelpLink3Desc' },
    ],
  },
]
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">{{ t('aide.heading') }}</h1>
    <p class="mb-9 text-[14.5px] leading-relaxed text-muted">
      {{ t('aide.intro') }}
      <NuxtLink to="/contact" class="font-semibold text-primary">{{ t('aide.introContactLink') }}</NuxtLink>.
    </p>

    <div class="flex flex-col gap-9">
      <section v-for="category in CATEGORIES" :key="category.titleKey">
        <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">{{ t(category.titleKey) }}</h2>
        <div class="flex flex-col gap-3">
          <NuxtLink
            v-for="link in category.links"
            :key="link.to"
            :to="link.to"
            class="press rounded-card border border-hairline bg-surface p-4 hover:border-primary/40"
          >
            <div class="mb-1 text-[14.5px] font-bold text-dark">{{ t(link.titleKey) }}</div>
            <p class="text-[13px] text-muted">{{ t(link.descriptionKey) }}</p>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
