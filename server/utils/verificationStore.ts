/**
 * Store en mémoire pour la vérification d'identité (#180+1) : carte
 * d'identité + photo passeport (fond blanc, format international)
 * télé-versées par l'utilisateur — chercheur ou prestataire. Suffisant pour
 * ce lot (pas de base de données encore en place, voir #45/#46).
 *
 * Pas d'équipe de modération dans ce prototype (aucune interface
 * d'administration ailleurs dans l'app, ex. complaintStore) : la
 * soumission des deux pièces certifie immédiatement le compte, dans le même
 * esprit que le badge « Vérifié » déjà décrit aux CGU comme reposant sur
 * les éléments déclaratifs fournis par l'utilisateur, sans garantie ni
 * contrôle d'antécédents.
 */

export interface Verification {
  userId: string
  /** Image encodée en data URL (base64) — aucun stockage fichier dans ce prototype. */
  idCardImage: string
  /** Photo passeport fond blanc, format international — même format de stockage. */
  passportPhotoImage: string
  submittedAt: number
}

const verificationsByUserId = new Map<string, Verification>()

const ACCEPTED_IMAGE_PREFIXES = ['data:image/jpeg;base64,', 'data:image/jpg;base64,', 'data:image/png;base64,']
/** ~5 Mo par image d'origine une fois décodée (le base64 gonfle la taille d'environ 33 %). */
const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000

export function isValidIdentityImage(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_IMAGE_DATA_URL_LENGTH) return false
  return ACCEPTED_IMAGE_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function submitVerification(userId: string, idCardImage: string, passportPhotoImage: string): Verification {
  const verification: Verification = { userId, idCardImage, passportPhotoImage, submittedAt: Date.now() }
  verificationsByUserId.set(userId, verification)
  return verification
}

export function getVerification(userId: string): Verification | null {
  return verificationsByUserId.get(userId) ?? null
}

export function isVerified(userId: string): boolean {
  return verificationsByUserId.has(userId)
}
