import { getAPropos } from './aPropos'
import { CGU } from './cgu'
import { CONFIDENTIALITE } from './confidentialite'
import { COOKIES } from './cookies'
import { MENTIONS_LEGALES } from './mentionsLegales'
import type { LegalPage } from './types'

export type { LegalPage, LegalSection } from './types'

/**
 * `t` n'est utilisé que par `getAPropos` pour l'instant (#i18n, seule page de
 * ce dossier déjà traduite) — les autres pages légales restent en français
 * uniquement jusqu'à leur lot de traduction dédié (contenu juridique, traité
 * à part).
 */
export function getLegalPage(slug: string, t: (key: string) => string): LegalPage | undefined {
  const pages: LegalPage[] = [getAPropos(t), MENTIONS_LEGALES, CGU, CONFIDENTIALITE, COOKIES]
  return pages.find((page) => page.slug === slug)
}
