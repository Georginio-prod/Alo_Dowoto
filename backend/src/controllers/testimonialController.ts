import type { Request, Response } from 'express'
import { testimonialService } from '../services/testimonialService'
import type { CreateTestimonialInput } from '../validation/schemas/testimonials'

/**
 * Handlers des avis d'accueil. Portés iso depuis
 * `server/api/testimonials/index.{get,post}.ts` (ADR-0016) : mêmes formes de
 * réponse (`{ testimonials }`, `{ testimonial }`) et même lecture de la locale.
 * Le corps du POST est déjà validé/normalisé par `validateBody` en amont — le
 * controller n'y refait aucune vérification de forme.
 */

/** GET /api/testimonials — `?locale=` sélectionne la langue des avis d'exemple (défaut `fr`). */
export async function listTestimonials(req: Request, res: Response): Promise<void> {
  const locale = req.query.locale === 'en' ? 'en' : 'fr'
  res.json({ testimonials: await testimonialService.listTestimonials(locale) })
}

/** POST /api/testimonials — ouvert à tout visiteur ; corps validé par `createTestimonialSchema`. */
export async function createTestimonial(req: Request, res: Response): Promise<void> {
  const { name, role, message, rating } = req.body as CreateTestimonialInput
  const testimonial = await testimonialService.addTestimonial(name, role, message, rating)
  res.json({ testimonial })
}
