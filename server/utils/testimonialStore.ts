import { randomUUID } from 'node:crypto'

/**
 * Store en mémoire pour les avis libres affichés sur la page d'accueil
 * (section « Ce que nos utilisateurs en disent »). Distinct des notations
 * de collaboration (reviewStore.ts, liées à une conversation précise) :
 * ici, n'importe quel visiteur peut partager son expérience générale de
 * WorkTogo, sans compte ni conversation associée. Suffisant pour ce lot
 * (pas de base de données encore en place, voir #45/#46).
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

/** Avis d'exemple, pour que la section ne soit pas vide avant les premières contributions réelles. */
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

const testimonials: Testimonial[] = [...SEED_TESTIMONIALS]

/** Les plus récents d'abord — nouvellement ajoutés en tête, comme un vrai fil d'avis. */
export function listTestimonials(): Testimonial[] {
  return [...testimonials].sort((a, b) => b.createdAt - a.createdAt)
}

export function addTestimonial(name: string, role: TestimonialRole, message: string, rating: number): Testimonial {
  const testimonial: Testimonial = { id: randomUUID(), name, role, message, rating, createdAt: Date.now() }
  testimonials.unshift(testimonial)
  return testimonial
}
