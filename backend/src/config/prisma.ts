import { PrismaClient } from '@prisma/client'
import { env } from './env'

/**
 * Client Prisma singleton du backend. Le cache sur `globalThis` évite d'ouvrir une connexion par
 * rechargement en développement (tsx watch). Cible PostgreSQL (ADR-0015), via
 * `DATABASE_URL` — la base du conteneur Docker (`docker-compose.yml`).
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

export const prisma = globalForPrisma.__prisma ?? new PrismaClient()

if (!env.isProd) {
  globalForPrisma.__prisma = prisma
}
