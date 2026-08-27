import { describe, expect, it } from 'vitest'
import { prisma } from '../prisma'

/**
 * Prouve que le client Prisma généré se connecte à PostgreSQL et exécute une
 * requête. Nécessite la base Docker démarrée (`docker compose up -d postgres`)
 * et `DATABASE_URL` renseigné — sinon le test est ignoré (utile en CI sans base
 * tant qu'aucun workflow backend n'est branché).
 */
describe('Connexion Prisma → PostgreSQL', () => {
  it.skipIf(!process.env.DATABASE_URL)('se connecte et exécute SELECT 1', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`
    expect(Number(rows[0]?.ok)).toBe(1)
    await prisma.$disconnect()
  })
})
