import { SUPPORT_EMAIL } from '../companyInfo'
import { LAST_UPDATED, type LegalPage } from './types'

/**
 * Contenu piloté par les clés `cookiesPage.*` (#i18n), même principe que
 * app/data/legalPages/aPropos.ts — `getCookies` prend le `t` réactif de
 * useI18n en paramètre plutôt que du texte français en dur.
 */
export function getCookies(t: (key: string, params?: Record<string, unknown>) => string): LegalPage {
  return {
    slug: 'cookies',
    title: t('cookiesPage.title'),
    intro: t('cookiesPage.intro'),
    updatedAt: LAST_UPDATED,
    sections: [
      {
        heading: t('cookiesPage.s1Heading'),
        body: [t('cookiesPage.s1Body1')],
      },
      {
        heading: t('cookiesPage.s2Heading'),
        body: [t('cookiesPage.s2Body1')],
        list: [t('cookiesPage.s2List1'), t('cookiesPage.s2List2')],
      },
      {
        heading: t('cookiesPage.s3Heading'),
        body: [t('cookiesPage.s3Body1'), t('cookiesPage.s3Body2')],
      },
      {
        heading: t('cookiesPage.s4Heading'),
        body: [t('cookiesPage.s4Body1')],
      },
      {
        heading: t('cookiesPage.s5Heading'),
        body: [t('cookiesPage.s5Body1')],
      },
      {
        heading: t('cookiesPage.s6Heading'),
        body: [t('cookiesPage.s6Body1', { email: SUPPORT_EMAIL })],
      },
    ],
  }
}
