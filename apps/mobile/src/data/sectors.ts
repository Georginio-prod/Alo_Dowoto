/** Secteurs — repris de `app/data/sectors.ts` (slug/nom/emoji/couleur). */
export interface Sector {
  slug: string
  name: string
  emoji: string
  /** Couleur de la tuile d'icône (design-edo.html / app/data/sectors.ts). */
  color: string
  /** Sous-titre indicatif (exemples de métiers). */
  hint: string
}

export const SECTORS: readonly Sector[] = [
  { slug: 'btp', name: 'Artisanat & BTP', emoji: '🔨', color: '#D97706', hint: 'Plomberie, électricité…' },
  { slug: 'menage', name: 'Ménage & Maison', emoji: '🧹', color: '#14A800', hint: 'Ménage, jardinage…' },
  { slug: 'digital', name: 'Informatique', emoji: '💻', color: '#2563EB', hint: 'Dev, réparation…' },
  { slug: 'beaute', name: 'Beauté & Bien-être', emoji: '💇', color: '#DB2777', hint: 'Coiffure, soins…' },
  { slug: 'evenement', name: 'Événementiel', emoji: '🎉', color: '#7C3AED', hint: 'Traiteur, déco…' },
  { slug: 'education', name: 'Éducation & Cours', emoji: '📚', color: '#0891B2', hint: 'Soutien, langues…' },
  { slug: 'transport', name: 'Transport & Livraison', emoji: '🚚', color: '#EA580C', hint: 'Livraison, déménagement…' },
  { slug: 'commerce', name: 'Commerce', emoji: '🛍️', color: '#DC2626', hint: 'Vente, distribution…' },
  { slug: 'industrie', name: 'Industrie', emoji: '🏭', color: '#4B5563', hint: 'Production, maintenance…' },
  { slug: 'sante', name: 'Santé & Bien-être', emoji: '🩺', color: '#059669', hint: 'Soins, assistance…' },
]

export function findSector(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug)
}
