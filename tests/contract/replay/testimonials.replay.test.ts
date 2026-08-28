// @vitest-environment node
//
// Rejeu de contrat du domaine « avis d'accueil » : les MÊMES requêtes sont
// envoyées au serveur Nitro (référence, `server/api/testimonials/**`) et au
// backend Express (portage, `backend/src/routes/testimonials.routes.ts`), et
// l'on affirme statut + corps identiques (ADR-0016). Les deux tapent la même
// base de test (`DATABASE_URL` du worker Vitest). Premier domaine outillé :
// sert de gabarit de rejeu pour les suivants.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import testimonialsGet from '~~/server/api/testimonials/index.get'
import testimonialsPost from '~~/server/api/testimonials/index.post'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { compose, normalizeErrorEnvelope, normalizeSeedTimestamps, stripGenerated } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
const cleanupIds: string[] = []

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/testimonials', handler: testimonialsGet },
    { method: 'post', path: '/api/testimonials', handler: testimonialsPost },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  // État de départ commun : un avis réel visible + un avis modéré (hidden). Vus
  // à l'identique par les deux runtimes (même base) → le rejeu exerce le rendu
  // des avis réels ET le filtre de modération.
  const visible = await prisma.testimonial.create({
    data: { name: '__replay_visible', role: 'client', message: 'Avis réel visible (rejeu).', rating: 5 },
  })
  const hidden = await prisma.testimonial.create({
    data: { name: '__replay_hidden', role: 'client', message: 'Avis modéré masqué (rejeu).', rating: 4, hidden: true },
  })
  cleanupIds.push(visible.id, hidden.id)
}, 30_000)

afterAll(async () => {
  if (cleanupIds.length) {
    await prisma.testimonial.deleteMany({ where: { id: { in: cleanupIds } } }).catch(() => undefined)
  }
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — GET /api/testimonials', () => {
  it('liste (locale fr par défaut) : Express == Nitro', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/testimonials' }, normalizeSeedTimestamps())
    // Le rejeu prouve l'égalité ; on vérifie en plus que le scénario est réel
    // (avis visible présent, avis masqué absent) et pas une double-réponse vide.
    const body = n.body as { testimonials: { id: string; name: string }[] }
    const names = body.testimonials.map((t) => t.name)
    expect(names).toContain('__replay_visible')
    expect(names).not.toContain('__replay_hidden')
  })

  it('liste traduite (locale en) : Express == Nitro', async () => {
    await expectIso(targets, { path: '/api/testimonials', query: { locale: 'en' } }, normalizeSeedTimestamps())
  })
})

describe('Rejeu de contrat — POST /api/testimonials', () => {
  // Création rejouée des deux côtés → deux lignes distinctes (id/createdAt
  // générés) : on neutralise ces champs, le reste de la forme doit être iso.
  const normalizeCreated = compose(stripGenerated('testimonial', ['id', 'createdAt']))

  it('avis valide : forme de réponse iso (hors champs générés)', async () => {
    const req = {
      method: 'POST' as const,
      path: '/api/testimonials',
      body: { name: '__replay_new', role: 'prestataire', message: 'Portage impeccable, rejeu vert !', rating: 5 },
    }
    const { nitro: n, express: e } = await expectIso(targets, req, normalizeCreated)
    for (const r of [n, e]) {
      const id = (r.body as { testimonial: { id: string } }).testimonial.id
      cleanupIds.push(id)
    }
    // Les deux ont bien renvoyé un avis créé, avec les champs échoués.
    expect((n.body as { testimonial: { name: string } }).testimonial.name).toBe('__replay_new')
  })

  it.each([
    { name: 'A', role: 'client', message: 'Message assez long pour passer.', rating: 5 },
    { name: 'Valide', role: 'client', message: 'court', rating: 5 },
    { name: 'Valide', role: 'autre', message: 'Message assez long pour passer.', rating: 5 },
    { name: 'Valide', role: 'client', message: 'Message assez long pour passer.', rating: 6 },
  ])('corps invalide → 400 iso (message exact) : %o', async (body) => {
    // Enveloppe d'erreur projetée sur le contrat client (error/statusCode/message),
    // en écartant url/statusMessage non déterministes.
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/testimonials', body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(400)
  })
})
