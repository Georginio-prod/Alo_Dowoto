import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine « réclamations » porté vers Express (Phase 2, ADR-0016) :
 * référence de suivi, **auth optionnelle par cookie** (rattachement du compte
 * si session présente, jamais exigé), messages de validation iso.
 *
 * Base de test ISOLÉE (globalSetup). Lignes créées marquées/nettoyées.
 */
describe('Contrat — réclamations (/api/reclamations)', () => {
  const app = createServer()
  const state = { userId: '', token: '' }
  const created: string[] = []

  const validBody = {
    category: 'technique',
    subject: 'Problème de connexion',
    message: 'Je ne parviens pas à me connecter depuis ce matin, merci de votre aide.',
    contactEmail: 'test@example.com',
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { contact: `+228-${randomUUID()}`, role: 'client', username: `u${randomUUID().slice(0, 8)}` },
    })
    state.userId = user.id
    state.token = randomUUID()
    await prisma.session.create({
      data: { token: state.token, userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
    })
  })

  afterAll(async () => {
    await prisma.complaint.deleteMany({ where: { id: { in: created } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: state.userId } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: state.userId } }).catch(() => undefined)
  })

  it('anonyme : 200 { reference: REF-XXXXXXXX } et userId null en base', async () => {
    const res = await request(app).post('/api/reclamations').send(validBody)
    expect(res.status).toBe(200)
    expect(res.body.reference).toMatch(/^REF-[0-9A-F]{8}$/)

    // La référence encode les 8 premiers caractères de l'id — on retrouve la ligne.
    const row = await prisma.complaint.findFirst({
      where: { contactEmail: 'test@example.com', userId: null },
      orderBy: { createdAt: 'desc' },
    })
    expect(row).not.toBeNull()
    expect(`REF-${row!.id.slice(0, 8).toUpperCase()}`).toBe(res.body.reference)
    created.push(row!.id)
  })

  it('avec cookie de session : le compte est rattaché (userId renseigné)', async () => {
    const res = await request(app)
      .post('/api/reclamations')
      .set('Cookie', `wt_session=${state.token}`)
      .send({ ...validBody, contactEmail: 'authed@example.com' })
    expect(res.status).toBe(200)

    const row = await prisma.complaint.findFirst({
      where: { contactEmail: 'authed@example.com' },
      orderBy: { createdAt: 'desc' },
    })
    expect(row?.userId).toBe(state.userId)
    if (row) created.push(row.id)
  })

  it('normalise (trim) le sujet et le message', async () => {
    const res = await request(app)
      .post('/api/reclamations')
      .send({ ...validBody, contactEmail: 'trim@example.com', subject: '   Sujet à espacer   ', message: '   Message avec espaces de bordure inclus.   ' })
    expect(res.status).toBe(200)
    const row = await prisma.complaint.findFirst({ where: { contactEmail: 'trim@example.com' }, orderBy: { createdAt: 'desc' } })
    expect(row?.subject).toBe('Sujet à espacer')
    expect(row?.message).toBe('Message avec espaces de bordure inclus.')
    if (row) created.push(row.id)
  })

  it.each([
    [{ ...{ subject: 'Sujet valide', message: 'Message suffisamment long pour valider.', contactEmail: 'a@b.c' }, category: 'inconnue' }, 'Sélectionnez une catégorie de réclamation.'],
    [{ category: 'autre', subject: 'ab', message: 'Message suffisamment long pour valider.', contactEmail: 'a@b.c' }, 'Le sujet doit contenir entre 3 et 120 caractères.'],
    [{ category: 'autre', subject: 'Sujet valide', message: 'court', contactEmail: 'a@b.c' }, 'Le message doit contenir entre 10 et 2000 caractères.'],
    [{ category: 'autre', subject: 'Sujet valide', message: 'Message suffisamment long pour valider.', contactEmail: '   ' }, 'Indiquez une adresse email ou un numéro de téléphone de contact.'],
  ])('corps invalide → 400 iso (message exact)', async (body, message) => {
    const res = await request(app).post('/api/reclamations').send(body)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: true, statusCode: 400, message })
  })
})
