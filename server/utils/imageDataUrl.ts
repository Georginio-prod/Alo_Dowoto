/**
 * Validation partagée des images fournies par l'utilisateur sous forme de
 * data URI (photos de profil prestataire, pièces d'identité de vérification).
 *
 * Source unique de vérité : les avatars comme les pièces de vérification sont
 * uploadés côté client via `readFileAsDataUrl` (jamais des URL externes). Les
 * accepter uniquement en `data:image/...;base64,` — et non comme une chaîne
 * libre — ferme le vecteur relevé à l'audit (F1) : un prestataire ne peut plus
 * stocker une URL de pistage tierce (ou un schéma exotique) qui serait ensuite
 * rendue dans un `<img src>`. Complète le durcissement `img-src` de la CSP
 * (server/middleware/security.ts), qui refuse de toute façon d'afficher une
 * image hors `'self'`, `data:` et tuiles OpenStreetMap.
 */

export const ACCEPTED_IMAGE_DATA_URL_PREFIXES = [
  'data:image/jpeg;base64,',
  'data:image/jpg;base64,',
  'data:image/png;base64,',
] as const

/** ~5 Mo par image d'origine une fois décodée (le base64 gonfle la taille d'environ 33 %). */
export const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000

/** Vrai si `value` est un data URI image accepté (JPEG/PNG) et de taille raisonnable. */
export function isValidImageDataUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_IMAGE_DATA_URL_LENGTH) return false
  return ACCEPTED_IMAGE_DATA_URL_PREFIXES.some((prefix) => value.startsWith(prefix))
}
