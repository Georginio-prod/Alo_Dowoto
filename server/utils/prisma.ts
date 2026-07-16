import { PrismaClient } from '@prisma/client'

/**
 * Singleton PrismaClient partagé par tout le serveur (#218). Le cache sur
 * `globalThis` évite d'ouvrir une nouvelle connexion SQLite à chaque
 * rechargement HMR de Nitro en développement.
 */

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

export const prisma = globalForPrisma.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}
