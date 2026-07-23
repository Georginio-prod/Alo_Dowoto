import type { Favorite as PrismaFavorite } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Favoris client → prestataire (#65), persistés en base (Prisma/SQLite, #357,
 * ADR 0013). Contrairement à l'ancien store en mémoire, les favoris survivent
 * aux redémarrages du serveur. La clé primaire composite
 * (`clientId` + `providerId`) garantit l'idempotence sans clé étrangère (un
 * prestataire peut être une fiche de l'annuaire de démonstration).
 */

export interface Favorite {
  clientId: string
  providerId: string
  createdAt: number
}

function toFavorite(row: PrismaFavorite): Favorite {
  return { clientId: row.clientId, providerId: row.providerId, createdAt: row.createdAt.getTime() }
}

/** Ajoute un favori. Idempotent : un second appel ne duplique rien et ne réinitialise pas `createdAt`. */
export async function addFavorite(clientId: string, providerId: string): Promise<Favorite> {
  const row = await prisma.favorite.upsert({
    where: { clientId_providerId: { clientId, providerId } },
    update: {}, // pas de modification si déjà présent : createdAt reste celui du premier ajout
    create: { clientId, providerId, createdAt: new Date(Date.now()) },
  })
  return toFavorite(row)
}

/** Retire un favori. Idempotent : retirer un favori absent ne lève pas d'erreur. */
export async function removeFavorite(clientId: string, providerId: string): Promise<void> {
  await prisma.favorite.deleteMany({ where: { clientId, providerId } })
}

/** Liste les favoris d'un client, du plus récent au plus ancien. */
export async function listFavorites(clientId: string): Promise<Favorite[]> {
  const rows = await prisma.favorite.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } })
  return rows.map(toFavorite)
}

export async function isFavorite(clientId: string, providerId: string): Promise<boolean> {
  const row = await prisma.favorite.findUnique({ where: { clientId_providerId: { clientId, providerId } } })
  return row !== null
}
