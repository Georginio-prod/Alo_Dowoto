import type { Verification as PrismaVerification } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Vérification d'identité (#180+1), désormais **persistée en base**
 * (Prisma/Postgres) — l'ancien store en mémoire est remplacé, les soumissions
 * survivent aux redémarrages et le badge « Vérifié » devient lisible par le
 * backend Express (ADR-0015/0017). Comportement observable **iso** : mêmes
 * règles, mêmes formes ; seules les lectures passent d'un accès synchrone à un
 * accès `async` (source = base, comme providerStore/reviewStore).
 *
 * Auto-certification : la soumission des deux pièces certifie immédiatement le
 * compte (pas d'équipe de modération dans ce prototype).
 *
 * Minimisation des données (#286) : les images (pièce d'identité + photo
 * passeport) sont la catégorie la plus sensible. Une fois le compte certifié,
 * elles sont effacées passé `ID_DOCUMENT_RETENTION_MS` (`applyRetentionPurge`),
 * sans jamais revenir sur le statut « Vérifié » déjà acquis.
 */

export interface Verification {
  userId: string
  /** Image encodée en data URL (base64), ou `null` une fois purgée. */
  idCardImage: string | null
  /** Photo passeport fond blanc, format international — même format de stockage. */
  passportPhotoImage: string | null
  submittedAt: number
  /** Horodatage de la purge automatique des images, ou `null` tant qu'elles sont conservées. */
  purgedAt: number | null
}

/** Durée de conservation des images de pièce d'identité après vérification (#286) : 90 jours. */
export const ID_DOCUMENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

/**
 * Une pièce d'identité valide est un data URI image accepté — même règle que
 * les avatars, factorisée dans `imageDataUrl.ts` (F1). Alias conservé pour ne
 * pas toucher aux appelants (apiValidationMisc, tests).
 */
export const isValidIdentityImage = isValidImageDataUrl

function toVerification(row: PrismaVerification): Verification {
  return {
    userId: row.userId,
    idCardImage: row.idCardImage,
    passportPhotoImage: row.passportPhotoImage,
    submittedAt: row.submittedAt.getTime(),
    purgedAt: row.purgedAt?.getTime() ?? null,
  }
}

/**
 * Efface en base les images d'une soumission dont le délai de conservation est
 * dépassé (le statut « Vérifié » n'est jamais affecté), et renvoie la version à
 * jour. No-op si déjà purgée ou encore dans le délai.
 */
async function applyRetentionPurge(row: PrismaVerification): Promise<PrismaVerification> {
  if (row.purgedAt !== null) return row
  if (Date.now() - row.submittedAt.getTime() < ID_DOCUMENT_RETENTION_MS) return row

  return prisma.verification.update({
    where: { userId: row.userId },
    data: { idCardImage: null, passportPhotoImage: null, purgedAt: new Date() },
  })
}

export async function submitVerification(userId: string, idCardImage: string, passportPhotoImage: string): Promise<Verification> {
  // Une nouvelle soumission remplace la précédente et repart d'un état non purgé.
  // `submittedAt` posé côté JS (et non via le défaut base) pour rester cohérent
  // avec la comparaison de rétention (`Date.now()`), y compris quand un test fige
  // l'horloge.
  const submittedAt = new Date(Date.now())
  const row = await prisma.verification.upsert({
    where: { userId },
    create: { userId, idCardImage, passportPhotoImage, submittedAt },
    update: { idCardImage, passportPhotoImage, submittedAt, purgedAt: null },
  })
  return toVerification(row)
}

export async function getVerification(userId: string): Promise<Verification | null> {
  const row = await prisma.verification.findUnique({ where: { userId } })
  if (!row) return null
  return toVerification(await applyRetentionPurge(row))
}

export async function isVerified(userId: string): Promise<boolean> {
  const count = await prisma.verification.count({ where: { userId } })
  return count > 0
}

/** Effacement complet à la demande de l'utilisateur (#286, droit à l'effacement). Renvoie `true` si une soumission existait. */
export async function deleteVerification(userId: string): Promise<boolean> {
  const { count } = await prisma.verification.deleteMany({ where: { userId } })
  return count > 0
}

/**
 * Toutes les vérifications soumises, les plus récentes d'abord (#dashboard-admin,
 * file de KYC à traiter). Purge d'abord les images expirées (en lot), puis liste.
 */
export async function listAllVerifications(): Promise<Verification[]> {
  const cutoff = new Date(Date.now() - ID_DOCUMENT_RETENTION_MS)
  await prisma.verification.updateMany({
    where: { purgedAt: null, submittedAt: { lt: cutoff } },
    data: { idCardImage: null, passportPhotoImage: null, purgedAt: new Date() },
  })
  const rows = await prisma.verification.findMany({ orderBy: { submittedAt: 'desc' } })
  return rows.map(toVerification)
}
