import type { Sector, SubSector } from '#domain-data/sectors'
import { SECTORS } from '#domain-data/sectors'

/**
 * Traduction d'affichage de la taxonomie des secteurs (#i18n).
 *
 * Les noms de secteurs et de sous-secteurs proviennent de `sectors.ts` en
 * français : ils servent d'identifiants « porteurs » (valeurs de requête,
 * clés de filtrage/correspondance dans resultats.vue, categories/[slug].vue…).
 * On ne les traduit donc PAS dans les données ; on fournit uniquement un
 * libellé traduit pour l'affichage, indexé par slug + rang du sous-secteur.
 *
 * Les clés vivent sous `sectorTaxonomy.<slug>.name` et
 * `sectorTaxonomy.<slug>.sub<index>`. Le
 * repli sur le nom français d'origine garantit qu'aucune zone ne reste vide
 * si une clé manque.
 */
export function useSectorI18n() {
  const { t, te } = useI18n({ useScope: 'global' })

  function sectorLabel(sector: Pick<Sector, 'slug' | 'name'>): string {
    const key = `sectorTaxonomy.${sector.slug}.name`
    return te(key) ? t(key) : sector.name
  }

  /** Libellé traduit d'un sous-secteur à partir de son secteur et de son objet. */
  function subSectorLabel(sector: Sector, sub: SubSector): string {
    const index = sector.subSectors.indexOf(sub)
    const key = `sectorTaxonomy.${sector.slug}.sub${index}`
    return index >= 0 && te(key) ? t(key) : sub.name
  }

  /**
   * Libellé traduit d'un sous-secteur à partir de son nom français canonique
   * (pour les points d'affichage qui ne disposent que de la chaîne du nom).
   */
  function subSectorLabelByName(sectorSlug: string, subName: string): string {
    const sector = SECTORS.find((s) => s.slug === sectorSlug)
    if (!sector) return subName
    const index = sector.subSectors.findIndex((s) => s.name === subName)
    const key = `sectorTaxonomy.${sector.slug}.sub${index}`
    return index >= 0 && te(key) ? t(key) : subName
  }

  return { sectorLabel, subSectorLabel, subSectorLabelByName }
}
