/** Secteurs — repris de `app/data/sectors.ts` (slug/nom/emoji identiques). */
export interface Sector {
  slug: string
  name: string
  emoji: string
}

export const SECTORS: readonly Sector[] = [
  { slug: 'btp', name: 'Artisanat & BTP', emoji: '🔨' },
  { slug: 'digital', name: 'Informatique & Digital', emoji: '💻' },
  { slug: 'menage', name: 'Ménage & Maison', emoji: '🧹' },
  { slug: 'beaute', name: 'Beauté & Bien-être', emoji: '💇' },
  { slug: 'evenement', name: 'Événementiel', emoji: '🎉' },
  { slug: 'education', name: 'Éducation & Cours', emoji: '📚' },
  { slug: 'transport', name: 'Transport & Livraison', emoji: '🚚' },
  { slug: 'commerce', name: 'Commerce', emoji: '🛍️' },
  { slug: 'industrie', name: 'Industrie', emoji: '🏭' },
  { slug: 'sante', name: 'Santé & Bien-être', emoji: '🩺' },
]

export function findSector(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug)
}
