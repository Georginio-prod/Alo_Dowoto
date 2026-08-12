import {
  COMPANY_NAME,
  HOSTING_PROVIDER,
  LEGAL_FORM,
  PUBLICATION_DIRECTOR,
  REGISTERED_ADDRESS,
  REGISTRATION_NUMBER,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  TAX_ID,
} from '../companyInfo'
import { LAST_UPDATED, type LegalPage } from './types'

/**
 * Contenu piloté par les clés `mentionsLegalesPage.*` (#i18n), même principe
 * que app/data/legalPages/aPropos.ts — `getMentionsLegales` prend le `t`
 * réactif de useI18n en paramètre plutôt que du texte français en dur.
 *
 * Les champs « [à compléter] » de companyInfo.ts (LEGAL_FORM,
 * REGISTRATION_NUMBER, etc.) sont des placeholders explicites (voir la
 * documentation de ce fichier) : traduits eux aussi via `toBeCompleted`
 * plutôt que reproduits tels quels, pour rester cohérents en anglais.
 */
export function getMentionsLegales(t: (key: string, params?: Record<string, unknown>) => string): LegalPage {
  const toBeCompleted = t('mentionsLegalesPage.toBeCompleted')
  const displayValue = (raw: string) => (raw === '[à compléter]' ? toBeCompleted : raw)

  return {
    slug: 'mentions-legales',
    title: t('mentionsLegalesPage.title'),
    intro: t('mentionsLegalesPage.intro'),
    updatedAt: LAST_UPDATED,
    sections: [
      {
        heading: t('mentionsLegalesPage.s1Heading'),
        body: [t('mentionsLegalesPage.s1Body1', { company: COMPANY_NAME })],
        list: [
          t('mentionsLegalesPage.s1List1', { value: displayValue(LEGAL_FORM) }),
          t('mentionsLegalesPage.s1List2', { value: displayValue(REGISTERED_ADDRESS) }),
          t('mentionsLegalesPage.s1List3', { value: displayValue(REGISTRATION_NUMBER) }),
          t('mentionsLegalesPage.s1List4', { value: displayValue(TAX_ID) }),
          t('mentionsLegalesPage.s1List5', { value: SUPPORT_EMAIL }),
          t('mentionsLegalesPage.s1List6', { value: SUPPORT_PHONE }),
        ],
      },
      {
        heading: t('mentionsLegalesPage.s2Heading'),
        body: [t('mentionsLegalesPage.s2Body1', { value: displayValue(PUBLICATION_DIRECTOR) })],
      },
      {
        heading: t('mentionsLegalesPage.s3Heading'),
        body: [t('mentionsLegalesPage.s3Body1', { value: displayValue(HOSTING_PROVIDER) })],
      },
      {
        heading: t('mentionsLegalesPage.s4Heading'),
        body: [t('mentionsLegalesPage.s4Body1'), t('mentionsLegalesPage.s4Body2')],
      },
      {
        heading: t('mentionsLegalesPage.s5Heading'),
        body: [t('mentionsLegalesPage.s5Body1')],
      },
      {
        heading: t('mentionsLegalesPage.s6Heading'),
        body: [t('mentionsLegalesPage.s6Body1')],
      },
      {
        heading: t('mentionsLegalesPage.s7Heading'),
        body: [t('mentionsLegalesPage.s7Body1')],
      },
      {
        heading: t('mentionsLegalesPage.s8Heading'),
        body: [t('mentionsLegalesPage.s8Body1', { email: SUPPORT_EMAIL, phone: SUPPORT_PHONE })],
      },
      {
        // Attribution requise par la licence CC BY-SA 4.0 de la vidéo d'accueil
        // (Wikimedia Commons) — voir public/onboarding/welcome.webm.
        heading: t('mentionsLegalesPage.s9Heading'),
        body: [t('mentionsLegalesPage.s9Body1')],
      },
    ],
  }
}
