export type ContactMethod = 'phone' | 'email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Normalise un contact vers une clé canonique stable : "+228XXXXXXXX" pour
 * un téléphone (8 chiffres togolais), l'email en minuscules sinon.
 * Retourne null si le contact ne respecte pas le format attendu.
 */
export function normalizeContact(method: ContactMethod, value: string): string | null {
  if (method === 'phone') {
    const digits = value.replace(/\D/g, '')
    if (digits.length < 8) return null
    return `+228${digits.slice(-8)}`
  }
  const email = value.trim().toLowerCase()
  return EMAIL_RE.test(email) ? email : null
}
