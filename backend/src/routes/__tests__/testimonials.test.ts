import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine « avis d'accueil » porté vers Express (Phase 2, ADR-0016) :
 * mêmes formes de réponse, même tri/fusion seeds, même filtre de modération et
 * mêmes messages de validation (400) que Nitro (`server/api/testimonials/**` +
 * `server/utils/testimonialStore.ts`).
 *
 * Contre la base de test ISOLÉE (globalSetup) — jamais `worktogo`. Les lignes
 * créées ici sont marquées et nettoyées en fin de suite.
 */
describe('Contrat — avis d’accueil (/api/testimonials)', () => {
  const app = createServer()
  const created: string[] = []
  const MARK = `__test_${Date.now()}`

  afterAll(async () => {
    await prisma.testimonial.deleteMany({ where: { name: { startsWith: MARK } } }).catch(() => undefined)
    if (created.length) {
      await prisma.testimonial.deleteMany({ where: { id: { in: created } } }).catch(() => undefined)
    }
  })

  describe('GET /api/testimonials', () => {
    it('renvoie 200 et la forme { testimonials: [...] } avec les 6 avis d’exemple', async () => {
      const res = await request(app).get('/api/testimonials')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.testimonials)).toBe(true)
      const ids = res.body.testimonials.map((t: { id: string }) => t.id)
      for (const seed of ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5', 'seed-6']) {
        expect(ids).toContain(seed)
      }
    })

    it('trie par createdAt décroissant (les plus récents d’abord)', async () => {
      const res = await request(app).get('/api/testimonials')
      const dates = res.body.testimonials.map((t: { createdAt: number }) => t.createdAt)
      const sorted = [...dates].sort((a, b) => b - a)
      expect(dates).toEqual(sorted)
    })

    it('traduit les avis d’exemple selon ?locale=en', async () => {
      const [fr, en] = await Promise.all([
        request(app).get('/api/testimonials').query({ locale: 'fr' }),
        request(app).get('/api/testimonials').query({ locale: 'en' }),
      ])
      const seedFr = fr.body.testimonials.find((t: { id: string }) => t.id === 'seed-1')
      const seedEn = en.body.testimonials.find((t: { id: string }) => t.id === 'seed-1')
      expect(seedFr.message).toContain('aide-ménagère')
      expect(seedEn.message).toContain('housekeeper')
    })

    it('expose les avis réels non masqués et cache ceux modérés (hidden:true)', async () => {
      const visible = await prisma.testimonial.create({
        data: { name: `${MARK}_visible`, role: 'client', message: 'Avis visible de test.', rating: 5 },
      })
      const hidden = await prisma.testimonial.create({
        data: { name: `${MARK}_hidden`, role: 'client', message: 'Avis masqué de test.', rating: 5, hidden: true },
      })
      created.push(visible.id, hidden.id)

      const res = await request(app).get('/api/testimonials')
      const ids = res.body.testimonials.map((t: { id: string }) => t.id)
      expect(ids).toContain(visible.id)
      expect(ids).not.toContain(hidden.id)
    })
  })

  describe('POST /api/testimonials', () => {
    it('crée un avis valide et renvoie { testimonial } (id + createdAt numérique)', async () => {
      const res = await request(app)
        .post('/api/testimonials')
        .send({ name: `${MARK}_new`, role: 'prestataire', message: 'Excellent service, je recommande vivement !', rating: 4 })
      expect(res.status).toBe(200)
      expect(res.body.testimonial).toMatchObject({
        name: `${MARK}_new`,
        role: 'prestataire',
        message: 'Excellent service, je recommande vivement !',
        rating: 4,
      })
      expect(typeof res.body.testimonial.id).toBe('string')
      expect(typeof res.body.testimonial.createdAt).toBe('number')
      created.push(res.body.testimonial.id)

      // L'avis créé apparaît ensuite dans la liste.
      const list = await request(app).get('/api/testimonials')
      const ids = list.body.testimonials.map((t: { id: string }) => t.id)
      expect(ids).toContain(res.body.testimonial.id)
    })

    it('normalise (trim) le nom et le message', async () => {
      const res = await request(app)
        .post('/api/testimonials')
        .send({ name: `  ${MARK}_trim  `, role: 'client', message: '   Message avec espaces autour.   ', rating: 3 })
      expect(res.status).toBe(200)
      expect(res.body.testimonial.name).toBe(`${MARK}_trim`)
      expect(res.body.testimonial.message).toBe('Message avec espaces autour.')
      created.push(res.body.testimonial.id)
    })

    it.each([
      [{ name: 'A', role: 'client', message: 'Message assez long pour passer.', rating: 5 }, 'Le nom doit contenir entre 2 et 60 caractères.'],
      [{ name: 'Valide', role: 'client', message: 'court', rating: 5 }, 'Le message doit contenir entre 10 et 400 caractères.'],
      [{ name: 'Valide', role: 'autre', message: 'Message assez long pour passer.', rating: 5 }, 'Précisez si vous êtes chercheur ou prestataire.'],
      [{ name: 'Valide', role: 'client', message: 'Message assez long pour passer.', rating: 6 }, 'La note doit être un nombre entier entre 1 et 5.'],
      [{ name: 'Valide', role: 'client', message: 'Message assez long pour passer.', rating: 2.5 }, 'La note doit être un nombre entier entre 1 et 5.'],
    ])('rejette un corps invalide en 400 au format Nitro avec le message exact', async (payload, message) => {
      const res = await request(app).post('/api/testimonials').send(payload)
      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ error: true, statusCode: 400, message })
    })
  })
})
