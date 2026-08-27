import { describe, expect, it } from 'vitest'
import { prisma } from '../prisma'

/**
 * Prouve que le client Prisma généré se connecte à PostgreSQL et exécute une
 * requête, contre la base de test ISOLÉE préparée par le globalSetup (jamais la
 * base partagée `worktogo`). Nécessite le conteneur Docker démarré
 * (`docker compose up -d postgres`).
 */
describe('Connexion Prisma → PostgreSQL', () => {
  it('se connecte et exécute SELECT 1', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`
    expect(Number(rows[0]?.ok)).toBe(1)
    await prisma.$disconnect()
  })
})
