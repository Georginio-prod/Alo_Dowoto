export interface LegalSection {
  heading: string
  body: string[]
  /** Puces optionnelles affichées après les paragraphes de `body` (ex. liste des droits, des cookies). */
  list?: string[]
}

export interface LegalPage {
  slug: string
  title: string
  intro: string
  /** Date d'entrée en vigueur affichée sous le titre (ex. "14 juillet 2026"), absente pour les pages non versionnées comme "À propos". */
  updatedAt?: string
  sections: LegalSection[]
}

/** Date de dernière mise à jour commune aux pages légales versionnées (mentions légales, CGU, confidentialité, cookies). */
export const LAST_UPDATED = '14 juillet 2026'
