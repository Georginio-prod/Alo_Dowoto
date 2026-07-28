import frMessages from '~~/i18n/locales/fr.json'

/**
 * Contenu FAQ (#i18n) — entièrement piloté par les clés `faq.*` de
 * i18n/locales/{fr,en}.json plutôt que du texte français en dur, pour rester
 * cohérent avec le reste de l'internationalisation (voir LanguageSwitcher.vue).
 *
 * Utilisé par la page FAQ (locale active, via `getFaqCategories(t)` avec le
 * `t` réactif de useI18n) et par l'outil `consulterFAQ` de l'assistant IA
 * (server/utils/ai/tools.ts, via `getFaqCategoriesFr()`) : le second n'a pas
 * de contexte vue-i18n (util serveur Nitro pur) et l'assistant répond
 * toujours en français par conception (#geoloc/2.4) — `frLookup` retrouve
 * directement les mêmes clés dans i18n/locales/fr.json plutôt que de dupliquer
 * ce contenu.
 */
export interface FaqItem {
  question: string
  answer: string
}

export interface FaqCategory {
  id: string
  title: string
  items: FaqItem[]
}

function frLookup(key: string): string {
  const value = key.split('.').reduce<unknown>((node, segment) => {
    return typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[segment] : undefined
  }, frMessages)
  return typeof value === 'string' ? value : key
}

export function getFaqCategories(t: (key: string) => string): FaqCategory[] {
  return [
    {
      id: 'chercheurs',
      title: t('faq.catClients'),
      items: [
        { question: t('faq.catClientsQ1'), answer: t('faq.catClientsA1') },
        { question: t('faq.catClientsQ2'), answer: t('faq.catClientsA2') },
        { question: t('faq.catClientsQ3'), answer: t('faq.catClientsA3') },
        { question: t('faq.catClientsQ4'), answer: t('faq.catClientsA4') },
        { question: t('faq.catClientsQ5'), answer: t('faq.catClientsA5') },
        { question: t('faq.catClientsQ6'), answer: t('faq.catClientsA6') },
      ],
    },
    {
      id: 'prestataires',
      title: t('faq.catProviders'),
      items: [
        { question: t('faq.catProvidersQ1'), answer: t('faq.catProvidersA1') },
        { question: t('faq.catProvidersQ2'), answer: t('faq.catProvidersA2') },
        { question: t('faq.catProvidersQ3'), answer: t('faq.catProvidersA3') },
        { question: t('faq.catProvidersQ4'), answer: t('faq.catProvidersA4') },
        { question: t('faq.catProvidersQ5'), answer: t('faq.catProvidersA5') },
      ],
    },
    {
      id: 'compte',
      title: t('faq.catAccount'),
      items: [
        { question: t('faq.catAccountQ1'), answer: t('faq.catAccountA1') },
        { question: t('faq.catAccountQ2'), answer: t('faq.catAccountA2') },
        { question: t('faq.catAccountQ3'), answer: t('faq.catAccountA3') },
        { question: t('faq.catAccountQ4'), answer: t('faq.catAccountA4') },
        { question: t('faq.catAccountQ5'), answer: t('faq.catAccountA5') },
        { question: t('faq.catAccountQ6'), answer: t('faq.catAccountA6') },
      ],
    },
    {
      id: 'confidentialite',
      title: t('faq.catPrivacy'),
      items: [
        { question: t('faq.catPrivacyQ1'), answer: t('faq.catPrivacyA1') },
        { question: t('faq.catPrivacyQ2'), answer: t('faq.catPrivacyA2') },
        { question: t('faq.catPrivacyQ3'), answer: t('faq.catPrivacyA3') },
      ],
    },
  ]
}

/** FAQ toujours en français, pour l'assistant IA (voir server/utils/ai/tools.ts). */
export function getFaqCategoriesFr(): FaqCategory[] {
  return getFaqCategories(frLookup)
}
