import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { validateBody } from '../validation/validate'
import { createTestimonialSchema } from '../validation/schemas/testimonials'
import { createTestimonial, listTestimonials } from '../controllers/testimonialController'

/**
 * Avis d'accueil (#357). Premier domaine porté depuis Nitro
 * (`server/api/testimonials/**`) vers Express (Phase 2, ADR-0017) — sert de
 * gabarit de portage : `routes → controller → service → repository`, validation
 * via `validateBody`, réponses iso vérifiées par les tests de contrat.
 *
 * Monté sous `/api` par `config/server.ts` → chemins réels `/api/testimonials`,
 * identiques à Nitro : le reverse proxy passe-plat, aucun changement côté front.
 */
export const testimonialsRoutes = Router()

/**
 * @openapi
 * /testimonials:
 *   get:
 *     tags: [Testimonials]
 *     summary: Liste des avis d'accueil (avis réels + exemples)
 *     parameters:
 *       - in: query
 *         name: locale
 *         schema: { type: string, enum: [fr, en] }
 *         description: Langue des avis d'exemple (défaut `fr`). Les avis réels ne sont jamais traduits.
 *     responses:
 *       200:
 *         description: Avis, les plus récents d'abord.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 testimonials:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Testimonial' }
 */
testimonialsRoutes.get('/testimonials', asyncHandler(listTestimonials))

/**
 * @openapi
 * /testimonials:
 *   post:
 *     tags: [Testimonials]
 *     summary: Publier un avis d'accueil (ouvert à tout visiteur)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, role, message, rating]
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 60 }
 *               role: { type: string, enum: [client, prestataire] }
 *               message: { type: string, minLength: 10, maxLength: 400 }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       200:
 *         description: Avis créé.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 testimonial: { $ref: '#/components/schemas/Testimonial' }
 *       400:
 *         description: Corps invalide — erreur au format Nitro.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
testimonialsRoutes.post('/testimonials', validateBody(createTestimonialSchema), asyncHandler(createTestimonial))
