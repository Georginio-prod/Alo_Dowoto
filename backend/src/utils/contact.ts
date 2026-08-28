/**
 * Normalisation d'un contact vers une clé canonique. Portée **verbatim** depuis
 * `server/utils/contact.ts` (ADR-0016) : "+228XXXXXXXX" pour un téléphone
 * togolais (8 chiffres), l'email en minuscules sinon, `null` si le format n'est
 * pas respecté. Utilisée notamment par la recharge de portefeuille (#193).
 */
export type ContactMethod = 'phone' | 'email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeContact(method: ContactMethod, value: string): string | null {
  if (method === 'phone') {
    const digits = value.replace(/\D/g, '')
    if (digits.length < 8) return null
    return `+228${digits.slice(-8)}`
  }
  const email = value.trim().toLowerCase()
  return EMAIL_RE.test(email) ? email : null
}
