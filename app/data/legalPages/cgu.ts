import { LAST_UPDATED, type LegalPage } from './types'

/**
 * Contenu piloté par les clés `cguPage.*` (#i18n), même principe que
 * app/data/legalPages/aPropos.ts — `getCgu` prend le `t` réactif de
 * useI18n en paramètre plutôt que du texte français en dur.
 */
export function getCgu(t: (key: string) => string): LegalPage {
  return {
    slug: 'cgu',
    title: t('cguPage.title'),
    intro: t('cguPage.intro'),
    updatedAt: LAST_UPDATED,
    sections: [
      {
        heading: t('cguPage.s1Heading'),
        body: [t('cguPage.s1Body1'), t('cguPage.s1Body2')],
      },
      {
        heading: t('cguPage.s2Heading'),
        body: [],
        list: [
          t('cguPage.s2List1'),
          t('cguPage.s2List2'),
          t('cguPage.s2List3'),
          t('cguPage.s2List4'),
        ],
      },
      {
        heading: t('cguPage.s3Heading'),
        body: [
          t('cguPage.s3Body1'),
          t('cguPage.s3Body2'),
          t('cguPage.s3Body3'),
          t('cguPage.s3Body4'),
        ],
      },
      {
        heading: t('cguPage.s4Heading'),
        body: [t('cguPage.s4Body1'), t('cguPage.s4Body2')],
      },
      {
        heading: t('cguPage.s5Heading'),
        body: [t('cguPage.s5Body1'), t('cguPage.s5Body2')],
      },
      {
        heading: t('cguPage.s6Heading'),
        body: [t('cguPage.s6Body1'), t('cguPage.s6Body2'), t('cguPage.s6Body3')],
      },
      {
        heading: t('cguPage.s7Heading'),
        body: [t('cguPage.s7Body1'), t('cguPage.s7Body2')],
      },
      {
        heading: t('cguPage.s8Heading'),
        body: [t('cguPage.s8Body1'), t('cguPage.s8Body2')],
      },
      {
        heading: t('cguPage.s9Heading'),
        body: [t('cguPage.s9Body1'), t('cguPage.s9Body2')],
      },
      {
        heading: t('cguPage.s10Heading'),
        body: [t('cguPage.s10Body1'), t('cguPage.s10Body2')],
      },
      {
        heading: t('cguPage.s11Heading'),
        body: [t('cguPage.s11Body1')],
        list: [
          t('cguPage.s11List1'),
          t('cguPage.s11List2'),
          t('cguPage.s11List3'),
          t('cguPage.s11List4'),
          t('cguPage.s11List5'),
          t('cguPage.s11List6'),
        ],
      },
      {
        heading: t('cguPage.s12Heading'),
        body: [t('cguPage.s12Body1')],
      },
      {
        heading: t('cguPage.s13Heading'),
        body: [t('cguPage.s13Body1')],
      },
      {
        heading: t('cguPage.s14Heading'),
        body: [t('cguPage.s14Body1'), t('cguPage.s14Body2')],
      },
      {
        heading: t('cguPage.s15Heading'),
        body: [t('cguPage.s15Body1'), t('cguPage.s15Body2'), t('cguPage.s15Body3')],
      },
      {
        heading: t('cguPage.s16Heading'),
        body: [t('cguPage.s16Body1'), t('cguPage.s16Body2')],
      },
      {
        heading: t('cguPage.s17Heading'),
        body: [t('cguPage.s17Body1'), t('cguPage.s17Body2'), t('cguPage.s17Body3')],
      },
      {
        heading: t('cguPage.s18Heading'),
        body: [t('cguPage.s18Body1')],
      },
      {
        heading: t('cguPage.s19Heading'),
        body: [t('cguPage.s19Body1')],
      },
    ],
  }
}
