/**
 * Détection heuristique des tentatives de contournement dans un message
 * libre du fil de discussion (#265) : numéro de téléphone, e-mail, ou
 * mention d'un paiement/contact hors plateforme. Volontairement simple
 * (regex + liste de mots-clés) — un utilisateur déterminé à contourner
 * trouvera toujours une formulation qui échappe au filtre ; l'objectif est
 * de bloquer les tentatives évidentes, pas de garantir une détection
 * exhaustive.
 */

export type ContournementReason = 'phone' | 'email' | 'off_platform_mention'

const EMAIL_PATTERN = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/i

/**
 * Suite d'au moins 7 chiffres, séparés uniquement par des espaces, points ou
 * tirets (pas de « / » : évite de faussement détecter une date écrite
 * "12/07/2026"). 7 chiffres couvre un numéro togolais local (8 chiffres) ou
 * un numéro avec indicatif, tout en laissant passer la plupart des montants
 * (les prix affichés dans l'app dépassent rarement 6 chiffres).
 */
const PHONE_PATTERN = /(?:\d[\s.-]?){7,}\d/

const OFF_PLATFORM_KEYWORDS = [
  'hors app',
  'hors plateforme',
  'hors de l\'application',
  'hors de la plateforme',
  'en dehors de l\'app',
  'en dehors de la plateforme',
  'sans passer par l\'app',
  'sans passer par worktogo',
  'paiement cash',
  'payer cash',
  'en cash',
  'en espèces directement',
  'directement en espèces',
  'numéro whatsapp',
  'numero whatsapp',
  'contacte-moi directement',
  'appelle-moi directement',
]

export function detectContournementAttempt(text: string): ContournementReason | null {
  if (EMAIL_PATTERN.test(text)) return 'email'
  if (PHONE_PATTERN.test(text)) return 'phone'

  const normalized = text.toLowerCase()
  if (OFF_PLATFORM_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'off_platform_mention'

  return null
}
