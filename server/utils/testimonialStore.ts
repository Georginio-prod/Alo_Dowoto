import type { Testimonial as PrismaTestimonial } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Avis libres affichés sur la page d'accueil (section « Ce que nos
 * utilisateurs en disent »), persistés en base (Prisma/SQLite, #357, ADR
 * 0013). Distinct des notations de collaboration (reviewStore.ts, liées à une
 * conversation) : ici, n'importe quel visiteur peut partager son expérience
 * générale de WorkTogo.
 *
 * Les avis d'exemple (SEED_TESTIMONIALS) restent des constantes de code —
 * baseline pour que la section ne soit jamais vide — et sont fusionnés à la
 * lecture avec les avis réels stockés en base. Les contributions réelles,
 * elles, survivent désormais aux redémarrages.
 */

export type TestimonialRole = 'client' | 'prestataire'

export interface Testimonial {
  id: string
  name: string
  role: TestimonialRole
  message: string
  rating: number
  createdAt: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Avis d'exemple (baseline), pour que la section ne soit pas vide avant les premières contributions réelles. */
const SEED_TESTIMONIALS: Testimonial[] = [
  {
    id: 'seed-1',
    name: 'Ama K.',
    role: 'client',
    message: "J'ai trouvé une aide-ménagère sérieuse en moins d'une heure. Le profil vérifié m'a tout de suite rassurée.",
    rating: 5,
    createdAt: Date.now() - 12 * DAY_MS,
  },
  {
    id: 'seed-2',
    name: 'Kokou B.',
    role: 'prestataire',
    message: "Depuis mon abonnement, je reçois des demandes chaque semaine dans mon secteur. Le paiement Mobile Money est vraiment pratique.",
    rating: 5,
    createdAt: Date.now() - 9 * DAY_MS,
  },
  {
    id: 'seed-3',
    name: 'Sena A.',
    role: 'client',
    message: "Comparer les profils et les tarifs avant de contacter change tout. J'ai trouvé un développeur fiable pour mon site en deux jours.",
    rating: 4,
    createdAt: Date.now() - 7 * DAY_MS,
  },
  {
    id: 'seed-4',
    name: 'Adjoa M.',
    role: 'client',
    message: "La messagerie intégrée est simple : j'ai pu expliquer précisément mon besoin avant même le premier rendez-vous.",
    rating: 5,
    createdAt: Date.now() - 5 * DAY_MS,
  },
  {
    id: 'seed-5',
    name: 'Yao T.',
    role: 'prestataire',
    message: "Le badge « Vérifié » fait clairement la différence : les clients me contactent avec plus de confiance qu'avant.",
    rating: 4,
    createdAt: Date.now() - 3 * DAY_MS,
  },
  {
    id: 'seed-6',
    name: 'Nadia P.',
    role: 'client',
    message: "Application simple à utiliser, prestataires disponibles partout au Togo. Je recommande à mon entourage.",
    rating: 5,
    createdAt: Date.now() - 1 * DAY_MS,
  },
]

function toTestimonial(row: PrismaTestimonial): Testimonial {
  return {
    id: row.id,
    name: row.name,
    role: row.role as TestimonialRole,
    message: row.message,
    rating: row.rating,
    createdAt: row.createdAt.getTime(),
  }
}

/** Les plus récents d'abord — avis réels (base) et avis d'exemple (code) fusionnés. */
export async function listTestimonials(): Promise<Testimonial[]> {
  const rows = await prisma.testimonial.findMany()
  return [...rows.map(toTestimonial), ...SEED_TESTIMONIALS].sort((a, b) => b.createdAt - a.createdAt)
}

export async function addTestimonial(name: string, role: TestimonialRole, message: string, rating: number): Promise<Testimonial> {
  const row = await prisma.testimonial.create({
    data: { name, role, message, rating, createdAt: new Date(Date.now()) },
  })
  return toTestimonial(row)
}
