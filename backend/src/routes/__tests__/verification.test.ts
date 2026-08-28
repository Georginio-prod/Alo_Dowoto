import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { ID_DOCUMENT_RETENTION_MS } from '../../services/verificationService'

/**
 * Contrat du domaine « vérification d'identité » porté vers Express (Phase 2,
 * ADR-0016) : réservé à un utilisateur connecté (401 sinon), auto-certification à
 * la soumission des deux pièces (400 si invalides), aucune image renvoyée, et
 * minimisation des données (#286) — les images sont purgées passé le délai de
 * rétention sans revenir sur le statut « Vérifié ». Base de test ISOLÉE.
 */
describe('Contrat — vérification d\'identité (/api/verification)', () => {
  const app = createServer()
  const state = { userId: '', token: '' }
  const IMAGE = `data:image/png;base64,${'A'.repeat(200)}`

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `u${randomUUID().slice(0, 8)}` } })
    state.userId = u.id
    state.token = randomUUID()
    await prisma.session.create({ data: { token: state.token, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000) } })
  })

  afterAll(async () => {
    await prisma.verification.deleteMany({ where: { userId: state.userId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: state.userId } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: state.userId } }).catch(() => undefined)
  })

  const cookie = () => `wt_session=${state.token}`

  it('GET sans session → 401', async () => {
    const res = await request(app).get('/api/verification/me')
    expect(res.status).toBe(401)
  })

  it('GET avant toute soumission → { verified: false, submittedAt: null }', async () => {
    const res = await request(app).get('/api/verification/me').set('Cookie', cookie())
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ verified: false, submittedAt: null })
  })

  it('POST sans session → 401', async () => {
    const res = await request(app).post('/api/verification').send({ idCardImage: IMAGE, passportPhotoImage: IMAGE })
    expect(res.status).toBe(401)
  })

  it('POST avec pièces invalides → 400 (message iso)', async () => {
    const res = await request(app).post('/api/verification').set('Cookie', cookie()).send({ idCardImage: 'nope', passportPhotoImage: IMAGE })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: true, statusCode: 400 })
    expect(res.body.message).toContain("carte d'identité")
  })

  it('POST valide → auto-certification, puis GET reflète le statut', async () => {
    const post = await request(app).post('/api/verification').set('Cookie', cookie()).send({ idCardImage: IMAGE, passportPhotoImage: IMAGE })
    expect(post.status).toBe(200)
    expect(post.body.verified).toBe(true)
    expect(typeof post.body.submittedAt).toBe('number')

    const get = await request(app).get('/api/verification/me').set('Cookie', cookie())
    expect(get.body).toEqual({ verified: true, submittedAt: post.body.submittedAt })
    // Aucune image ne doit transiter par l'API.
    expect(get.body.idCardImage).toBeUndefined()
  })

  it('rétention (#286) : les images d\'une soumission expirée sont purgées au GET, le statut reste vérifié', async () => {
    // Soumission antérieure au délai de rétention, images encore présentes.
    const old = new Date(Date.now() - ID_DOCUMENT_RETENTION_MS - 1_000)
    await prisma.verification.upsert({
      where: { userId: state.userId },
      create: { userId: state.userId, idCardImage: IMAGE, passportPhotoImage: IMAGE, submittedAt: old, purgedAt: null },
      update: { idCardImage: IMAGE, passportPhotoImage: IMAGE, submittedAt: old, purgedAt: null },
    })

    const get = await request(app).get('/api/verification/me').set('Cookie', cookie())
    expect(get.body.verified).toBe(true) // statut préservé

    const row = await prisma.verification.findUnique({ where: { userId: state.userId } })
    expect(row?.idCardImage).toBeNull()
    expect(row?.passportPhotoImage).toBeNull()
    expect(row?.purgedAt).not.toBeNull()
  })
})
