import { A_PROPOS } from './aPropos'
import { CGU } from './cgu'
import { CONFIDENTIALITE } from './confidentialite'
import { COOKIES } from './cookies'
import { MENTIONS_LEGALES } from './mentionsLegales'

export type { LegalPage, LegalSection } from './types'

export const LEGAL_PAGES = [A_PROPOS, MENTIONS_LEGALES, CGU, CONFIDENTIALITE, COOKIES]

export function getLegalPage(slug: string) {
  return LEGAL_PAGES.find((page) => page.slug === slug)
}
