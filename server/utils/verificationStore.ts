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
 *
 * Minimisation des données (#286, audit sécurité) : les images sont la
 * catégorie de donnée la plus sensible de l'application (pièce d'identité +
 * photo passeport). Une fois le compte certifié, leur conservation
 * indéfinie ne sert plus aucune finalité — seul le fait d'être vérifié
 * (`isVerified`) doit persister. `applyRetentionPurgeIfExpired` les efface
 * automatiquement passé `ID_DOCUMENT_RETENTION_MS`, sans jamais revenir sur
 * le statut « Vérifié » déjà acquis.
 */

export interface Verification {
  userId: string
  /** Image encodée en data URL (base64), ou `null` une fois purgée (voir `applyRetentionPurgeIfExpired`). */
  idCardImage: string | null
  /** Photo passeport fond blanc, format international — même format de stockage. */
  passportPhotoImage: string | null
  submittedAt: number
  /** Horodatage de la purge automatique des images, ou `null` tant qu'elles sont encore conservées. */
  purgedAt: number | null
}

const verificationsByUserId = new Map<string, Verification>()

const ACCEPTED_IMAGE_PREFIXES = ['data:image/jpeg;base64,', 'data:image/jpg;base64,', 'data:image/png;base64,']
/** ~5 Mo par image d'origine une fois décodée (le base64 gonfle la taille d'environ 33 %). */
const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000

/** Durée de conservation des images de pièce d'identité après vérification (#286) : 90 jours, cohérent avec la politique de confidentialité. */
export const ID_DOCUMENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export function isValidIdentityImage(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_IMAGE_DATA_URL_LENGTH) return false
  return ACCEPTED_IMAGE_PREFIXES.some((prefix) => value.startsWith(prefix))
}

/** Efface les images une fois le délai de conservation dépassé — le statut « Vérifié » (`isVerified`) n'est jamais affecté. */
function applyRetentionPurgeIfExpired(verification: Verification): void {
  if (verification.purgedAt !== null) return
  if (Date.now() - verification.submittedAt < ID_DOCUMENT_RETENTION_MS) return

  verification.idCardImage = null
  verification.passportPhotoImage = null
  verification.purgedAt = Date.now()
}

export function submitVerification(userId: string, idCardImage: string, passportPhotoImage: string): Verification {
  const verification: Verification = { userId, idCardImage, passportPhotoImage, submittedAt: Date.now(), purgedAt: null }
  verificationsByUserId.set(userId, verification)
  return verification
}

export function getVerification(userId: string): Verification | null {
  const verification = verificationsByUserId.get(userId) ?? null
  if (verification) applyRetentionPurgeIfExpired(verification)
  return verification
}

export function isVerified(userId: string): boolean {
  return verificationsByUserId.has(userId)
}

/** Effacement complet à la demande de l'utilisateur (#286, droit à l'effacement — voir server/api/account/delete.post.ts). */
export function deleteVerification(userId: string): boolean {
  return verificationsByUserId.delete(userId)
}

/**
 * Toutes les vérifications soumises, les plus récentes d'abord
 * (#dashboard-admin, module Prestataires/Chercheurs — file de KYC à traiter).
 * Lecture directe du store en mémoire — voir docs/admin-dashboard.md pour la
 * portée (soumissions réelles mais volatiles, perdues au redémarrage).
 */
export function listAllVerifications(): Verification[] {
  return [...verificationsByUserId.values()]
    .map((verification) => {
      applyRetentionPurgeIfExpired(verification)
      return verification
    })
    .sort((a, b) => b.submittedAt - a.submittedAt)
}
