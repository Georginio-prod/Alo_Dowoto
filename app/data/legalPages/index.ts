import { getCgu } from './cgu'
import { getConfidentialite } from './confidentialite'
import { getCookies } from './cookies'
import { getMentionsLegales } from './mentionsLegales'
import type { LegalPage } from './types'

export type { LegalPage, LegalSection } from './types'

/**
 * "À propos" (#visuals) n'est plus servie par LegalPageView : la page dédiée
 * app/pages/a-propos.vue lit directement les clés i18n `aPropos.*` pour
 * intercaler photo/illustration entre les paragraphes — ce n'est pas une
 * page légale versionnée comme les 4 ci-dessous.
 */
export function getLegalPage(slug: string, t: (key: string, params?: Record<string, unknown>) => string): LegalPage | undefined {
  const pages: LegalPage[] = [getMentionsLegales(t), getCgu(t), getConfidentialite(t), getCookies(t)]
  return pages.find((page) => page.slug === slug)
}
