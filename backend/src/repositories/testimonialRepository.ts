import type { PrismaClient, Testimonial } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des avis d'accueil (`prisma.testimonial`). Porté iso depuis
 * `server/utils/testimonialStore.ts` (ADR-0016) : mêmes requêtes, même filtre
 * de modération. Client Prisma injecté (patron Phase 1, cf.
 * `sessionRepository.ts`) — aucune erreur framework, aucune logique métier ici
 * (la fusion avec les avis d'exemple et le tri appartiennent au service).
 */
export interface TestimonialRepository {
  /** Avis réels non masqués par la modération (#admin, `hidden: false`). */
  findVisible(): Promise<Testimonial[]>
  /** Persiste un nouvel avis et renvoie la ligne créée. */
  create(data: {
    name: string
    role: string
    message: string
    rating: number
  }): Promise<Testimonial>
}

export function createTestimonialRepository(db: PrismaClient): TestimonialRepository {
  return {
    findVisible() {
      return db.testimonial.findMany({ where: { hidden: false } })
    },
    create(data) {
      return db.testimonial.create({
        data: { ...data, createdAt: new Date(Date.now()) },
      })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const testimonialRepository = createTestimonialRepository(prisma)
