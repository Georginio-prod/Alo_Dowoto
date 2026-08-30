/**
 * Masque un contact libre (téléphone ou e-mail) saisi par le chercheur au
 * premier contact (#129), afin qu'il ne soit jamais visible en clair par le
 * prestataire avant la validation finale de la prestation (#264, anti-fuite).
 * Porté iso depuis `server/utils/contactMask.ts` (ADR-0016). Détecte
 * e-mail / numéro / texte quelconque plutôt que de supposer un format fixe.
 */
export function maskContact(value: string): string {
  const trimmed = value.trim()

  const atIndex = trimmed.indexOf('@')
  if (atIndex > 0) {
    const user = trimmed.slice(0, atIndex)
    const domain = trimmed.slice(atIndex + 1)
    const visible = user.slice(0, 2)
    return `${visible}${'•'.repeat(Math.max(user.length - visible.length, 3))}@${domain}`
  }

  const digitCount = (trimmed.match(/\d/g) ?? []).length
  if (digitCount >= 4) {
    let seen = 0
    return trimmed.replace(/\d/g, (digit) => {
      seen += 1
      const isEdgeDigit = seen <= 2 || seen > digitCount - 2
      return isEdgeDigit ? digit : '•'
    })
  }

  const visible = trimmed.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(trimmed.length - visible.length, 3))}`
}
