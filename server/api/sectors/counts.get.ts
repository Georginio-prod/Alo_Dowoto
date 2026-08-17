import { SECTORS } from '~~/app/data/sectors'

export interface SectorCount {
  slug: string
  count: number
}

/**
 * Nombre de prestataires par secteur (#66, grille `/categories`). Calculé à
 * partir de l'annuaire de démonstration (`server/utils/providerDirectory.ts`)
 * plutôt que codé en dur, pour rester correct quand le jeu de données évolue.
 */
export default defineEventHandler(async (): Promise<SectorCount[]> => {
  return Promise.all(
    SECTORS.map(async (sector) => ({
      slug: sector.slug,
      count: await countBySector(sector.slug),
    })),
  )
})
