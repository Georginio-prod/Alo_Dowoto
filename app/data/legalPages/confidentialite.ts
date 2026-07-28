import { COMPANY_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from '../companyInfo'
import { LAST_UPDATED, type LegalPage } from './types'

/**
 * Contenu piloté par les clés `confidentialitePage.*` (#i18n), même principe
 * que app/data/legalPages/aPropos.ts — `getConfidentialite` prend le `t`
 * réactif de useI18n en paramètre plutôt que du texte français en dur.
 */
export function getConfidentialite(t: (key: string, params?: Record<string, unknown>) => string): LegalPage {
  return {
    slug: 'confidentialite',
    title: t('confidentialitePage.title'),
    intro: t('confidentialitePage.intro', { company: COMPANY_NAME }),
    updatedAt: LAST_UPDATED,
    sections: [
      {
        heading: t('confidentialitePage.s1Heading'),
        body: [t('confidentialitePage.s1Body1', { company: COMPANY_NAME, email: SUPPORT_EMAIL })],
      },
      {
        heading: t('confidentialitePage.s2Heading'),
        body: [t('confidentialitePage.s2Body1')],
        list: [
          t('confidentialitePage.s2List1'),
          t('confidentialitePage.s2List2'),
          t('confidentialitePage.s2List3'),
          t('confidentialitePage.s2List4'),
          t('confidentialitePage.s2List5'),
          t('confidentialitePage.s2List6'),
          t('confidentialitePage.s2List7'),
        ],
      },
      {
        heading: t('confidentialitePage.s3Heading'),
        body: [t('confidentialitePage.s3Body1')],
        list: [
          t('confidentialitePage.s3List1'),
          t('confidentialitePage.s3List2'),
          t('confidentialitePage.s3List3'),
          t('confidentialitePage.s3List4'),
          t('confidentialitePage.s3List5'),
          t('confidentialitePage.s3List6'),
          t('confidentialitePage.s3List7'),
        ],
      },
      {
        heading: t('confidentialitePage.s4Heading'),
        body: [t('confidentialitePage.s4Body1'), t('confidentialitePage.s4Body2')],
      },
      {
        heading: t('confidentialitePage.s5Heading'),
        body: [
          t('confidentialitePage.s5Body1'),
          t('confidentialitePage.s5Body2'),
          t('confidentialitePage.s5Body3'),
          t('confidentialitePage.s5Body4'),
        ],
      },
      {
        heading: t('confidentialitePage.s6Heading'),
        body: [
          t('confidentialitePage.s6Body1'),
          t('confidentialitePage.s6Body2'),
          t('confidentialitePage.s6Body3'),
        ],
      },
      {
        heading: t('confidentialitePage.s7Heading'),
        body: [
          t('confidentialitePage.s7Body1'),
          t('confidentialitePage.s7Body2'),
          t('confidentialitePage.s7Body3'),
        ],
      },
      {
        heading: t('confidentialitePage.s8Heading'),
        body: [t('confidentialitePage.s8Body1')],
        list: [
          t('confidentialitePage.s8List1'),
          t('confidentialitePage.s8List2'),
          t('confidentialitePage.s8List3'),
          t('confidentialitePage.s8List4'),
          t('confidentialitePage.s8List5'),
          t('confidentialitePage.s8List6'),
        ],
      },
      {
        heading: t('confidentialitePage.s9Heading'),
        body: [t('confidentialitePage.s9Body1'), t('confidentialitePage.s9Body2')],
      },
      {
        heading: t('confidentialitePage.s10Heading'),
        body: [t('confidentialitePage.s10Body1')],
        list: [
          t('confidentialitePage.s10List1'),
          t('confidentialitePage.s10List2'),
          t('confidentialitePage.s10List3'),
          t('confidentialitePage.s10List4'),
        ],
      },
      {
        heading: t('confidentialitePage.s11Heading'),
        body: [
          t('confidentialitePage.s11Body1'),
          t('confidentialitePage.s11Body2', { email: SUPPORT_EMAIL, phone: SUPPORT_PHONE }),
          t('confidentialitePage.s11Body3'),
        ],
      },
      {
        heading: t('confidentialitePage.s12Heading'),
        body: [t('confidentialitePage.s12Body1')],
      },
      {
        heading: t('confidentialitePage.s13Heading'),
        body: [t('confidentialitePage.s13Body1')],
      },
      {
        heading: t('confidentialitePage.s14Heading'),
        body: [t('confidentialitePage.s14Body1')],
      },
    ],
  }
}
