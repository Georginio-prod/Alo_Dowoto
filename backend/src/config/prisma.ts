import { PrismaClient } from '@prisma/client'

/**
 * Client Prisma singleton du backend (même motif que server/utils/prisma.ts
 * côté Nitro). Le cache sur `globalThis` évite d'ouvrir une connexion par
 * rechargement en développement (tsx watch). Cible PostgreSQL (ADR-0015), via
 * `DATABASE_URL` — la base du conteneur Docker (`docker-compose.yml`).
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

export const prisma = globalForPrisma.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}
