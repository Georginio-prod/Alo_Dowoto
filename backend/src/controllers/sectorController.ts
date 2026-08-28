import type { Request, Response } from 'express'
import { SECTORS } from '../data/sectors'
import { countBySector } from '../services/providerDirectoryService'

/**
 * Comptage des prestataires par secteur (#66, grille `/categories`), porté iso
 * depuis `server/api/sectors/counts.get.ts` (ADR-0016). Route publique ; les
 * comptes sont calculés depuis l'annuaire (cohérent avec la recherche publique),
 * jamais codés en dur.
 */
export interface SectorCount {
  slug: string
  count: number
}

/** GET /api/sectors/counts → [{ slug, count }]. */
export async function getSectorCounts(_req: Request, res: Response): Promise<void> {
  const counts: SectorCount[] = await Promise.all(
    SECTORS.map(async (sector) => ({ slug: sector.slug, count: await countBySector(sector.slug) })),
  )
  res.json(counts)
}
