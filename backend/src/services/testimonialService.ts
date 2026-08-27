import type { Testimonial as PrismaTestimonial } from '@prisma/client'
import { testimonialRepository, type TestimonialRepository } from '../repositories/testimonialRepository'

/**
 * Avis libres de la page d'accueil. Logique **portée iso** depuis
 * `server/utils/testimonialStore.ts` (ADR-0016) — mêmes avis d'exemple, même
 * fusion base + seeds, même tri. Agnostique du framework (aucun auto-import
 * Nitro) : le repository (Prisma) est injecté, le service ne fait que la logique
 * métier. Il alimente le controller `testimonialController.ts`.
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

interface SeedTestimonial {
  id: string
  name: string
  role: TestimonialRole
  message: { fr: string; en: string }
  rating: number
  createdAt: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Avis d'exemple (baseline), pour que la section ne soit pas vide avant les premières contributions réelles. */
const SEED_TESTIMONIALS: SeedTestimonial[] = [
  {
    id: 'seed-1',
    name: 'Ama K.',
    role: 'client',
    message: {
      fr: "J'ai trouvé une aide-ménagère sérieuse en moins d'une heure. Le profil vérifié m'a tout de suite rassurée.",
      en: 'I found a reliable housekeeper in under an hour. The verified profile put me at ease right away.',
    },
    rating: 5,
    createdAt: Date.now() - 12 * DAY_MS,
  },
  {
    id: 'seed-2',
    name: 'Kokou B.',
    role: 'prestataire',
    message: {
      fr: "Depuis mon abonnement, je reçois des demandes chaque semaine dans mon secteur. Le paiement Mobile Money est vraiment pratique.",
      en: 'Since subscribing, I get requests every week in my area. Mobile Money payment is really convenient.',
    },
    rating: 5,
    createdAt: Date.now() - 9 * DAY_MS,
  },
  {
    id: 'seed-3',
    name: 'Sena A.',
    role: 'client',
    message: {
      fr: "Comparer les profils et les tarifs avant de contacter change tout. J'ai trouvé un développeur fiable pour mon site en deux jours.",
      en: 'Comparing profiles and rates before reaching out changes everything. I found a reliable developer for my website in two days.',
    },
    rating: 4,
    createdAt: Date.now() - 7 * DAY_MS,
  },
  {
    id: 'seed-4',
    name: 'Adjoa M.',
    role: 'client',
    message: {
      fr: "La messagerie intégrée est simple : j'ai pu expliquer précisément mon besoin avant même le premier rendez-vous.",
      en: 'The built-in messaging is simple: I was able to explain exactly what I needed before we even met.',
    },
    rating: 5,
    createdAt: Date.now() - 5 * DAY_MS,
  },
  {
    id: 'seed-5',
    name: 'Yao T.',
    role: 'prestataire',
    message: {
      fr: "Le badge « Vérifié » fait clairement la différence : les clients me contactent avec plus de confiance qu'avant.",
      en: "The 'Verified' badge clearly makes a difference: clients reach out to me with a lot more confidence than before.",
    },
    rating: 4,
    createdAt: Date.now() - 3 * DAY_MS,
  },
  {
    id: 'seed-6',
    name: 'Nadia P.',
    role: 'client',
    message: {
      fr: "Application simple à utiliser, prestataires disponibles partout au Togo. Je recommande à mon entourage.",
      en: 'Simple app to use, providers available all across Togo. I recommend it to my friends and family.',
    },
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

function seedToTestimonial(seed: SeedTestimonial, locale: 'fr' | 'en'): Testimonial {
  return {
    id: seed.id,
    name: seed.name,
    role: seed.role,
    message: locale === 'en' ? seed.message.en : seed.message.fr,
    rating: seed.rating,
    createdAt: seed.createdAt,
  }
}

export function createTestimonialService(repo: TestimonialRepository = testimonialRepository) {
  return {
    /** Les plus récents d'abord — avis réels (base) et avis d'exemple (code, traduits selon `locale`) fusionnés. */
    async listTestimonials(locale: 'fr' | 'en' = 'fr'): Promise<Testimonial[]> {
      const rows = await repo.findVisible()
      const seeds = SEED_TESTIMONIALS.map((seed) => seedToTestimonial(seed, locale))
      return [...rows.map(toTestimonial), ...seeds].sort((a, b) => b.createdAt - a.createdAt)
    },

    async addTestimonial(
      name: string,
      role: TestimonialRole,
      message: string,
      rating: number,
    ): Promise<Testimonial> {
      const row = await repo.create({ name, role, message, rating })
      return toTestimonial(row)
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const testimonialService = createTestimonialService()
