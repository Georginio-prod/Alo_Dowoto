import { SECTORS } from '~~/app/data/sectors'

/**
 * Catalogue des secteurs et sous-secteurs pour le dashboard admin
 * (`catalog.view`), en LECTURE SEULE. La source de vérité du catalogue est le
 * fichier de code `app/data/sectors.ts` (icônes Lucide, photos, i18n, pages de
 * catégorie par slug) — il n'est donc pas modifiable au runtime : toute
 * évolution passe par le code. Cette vue permet à l'admin de consulter le
 * catalogue tel que le site l'expose, avec le nombre de prestataires par
 * secteur (même comptage que l'endpoint public /api/sectors/counts).
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'catalog.view')

  const sectors = await Promise.all(
    SECTORS.map(async (s) => ({
      slug: s.slug,
      name: s.name,
      emoji: s.emoji,
      icon: s.icon,
      color: s.color,
      ink: s.ink,
      subSectors: s.subSectors.map((ss) => ss.name),
      providerCount: await countBySector(s.slug),
    })),
  )

  return {
    editable: false,
    sectors,
    totals: {
      sectors: sectors.length,
      subSectors: sectors.reduce((n, s) => n + s.subSectors.length, 0),
      providers: sectors.reduce((n, s) => n + s.providerCount, 0),
    },
  }
})
