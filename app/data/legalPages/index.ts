import { getAPropos } from './aPropos'
import { getCgu } from './cgu'
import { getConfidentialite } from './confidentialite'
import { getCookies } from './cookies'
import { getMentionsLegales } from './mentionsLegales'
import type { LegalPage } from './types'

export type { LegalPage, LegalSection } from './types'

export function getLegalPage(slug: string, t: (key: string, params?: Record<string, unknown>) => string): LegalPage | undefined {
  const pages: LegalPage[] = [getAPropos(t), getMentionsLegales(t), getCgu(t), getConfidentialite(t), getCookies(t)]
  return pages.find((page) => page.slug === slug)
}
