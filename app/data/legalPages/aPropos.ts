import type { LegalPage } from './types'

/**
 * Contenu traduit (#i18n) : contrairement aux autres pages légales de ce
 * dossier (encore en français uniquement, lot dédié à venir), cette page est
 * entièrement pilotée par les clés `aPropos.*` de i18n/locales/{fr,en}.json —
 * voir LegalPageView.vue, qui fournit `t` à cette fonction.
 */
export function getAPropos(t: (key: string) => string): LegalPage {
  return {
    slug: 'a-propos',
    title: t('aPropos.title'),
    intro: t('aPropos.intro'),
    sections: [
      {
        heading: t('aPropos.missionHeading'),
        body: [t('aPropos.missionBody1'), t('aPropos.missionBody2')],
      },
      {
        heading: t('aPropos.howHeading'),
        body: [t('aPropos.howBody1'), t('aPropos.howBody2')],
      },
    ],
  }
}
