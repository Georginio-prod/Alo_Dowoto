import { randomUUID } from 'node:crypto'
import cookieParser from 'cookie-parser'
import express, { type Express } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { errorHandler } from '../errorHandler'
import { requireAdminRole, requireSessionUser } from '../auth'

/**
 * Vérifie que les gardes d'auth du backend se comportent comme le Nitro actuel
 * (`server/utils/requireSessionUser.ts`) : cookie OU Bearer, expiration,
 * suspension, rôles — mêmes codes et messages (ADR-0016).
 *
 * S'exécute contre la base de test ISOLÉE préparée par le globalSetup (jamais la
 * base partagée `worktogo`). Nécessite le conteneur Docker démarré
 * (`docker compose up -d postgres`).
 */
function buildApp(): Express {
  const app = express()
  app.use(cookieParser())
  app.get('/me', requireSessionUser, (req, res) => {
    res.json({ id: req.user?.id, role: req.user?.role })
  })
  app.get('/admin', requireAdminRole, (_req, res) => {
    res.json({ ok: true })
  })
  app.use(errorHandler)
  return app
}

describe('Gardes d’auth du backend', () => {
  const app = buildApp()
  const state = { userId: '', token: '', expiredToken: '', suspendedUserId: '', suspendedToken: '' }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { contact: `+228-${randomUUID()}`, role: 'client', username: 'test' },
    })
    state.userId = user.id
    state.token = randomUUID()
    await prisma.session.create({
      data: { token: state.token, userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
    })
    state.expiredToken = randomUUID()
    await prisma.session.create({
      data: { token: state.expiredToken, userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    })

    const suspended = await prisma.user.create({
      data: { contact: `+228-${randomUUID()}`, role: 'client', status: 'suspended' },
    })
    state.suspendedUserId = suspended.id
    state.suspendedToken = randomUUID()
    await prisma.session.create({
      data: { token: state.suspendedToken, userId: suspended.id, expiresAt: new Date(Date.now() + 3_600_000) },
    })
  })

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: { in: [state.userId, state.suspendedUserId] } } })
    await prisma.user.deleteMany({ where: { id: { in: [state.userId, state.suspendedUserId] } } })
    await prisma.$disconnect()
  })

  it('cookie wt_session valide → 200 + utilisateur', async () => {
    const res = await request(app).get('/me').set('Cookie', `wt_session=${state.token}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(state.userId)
  })

  it('en-tête Bearer valide → 200 (auth desktop/mobile)', async () => {
    const res = await request(app).get('/me').set('Authorization', `Bearer ${state.token}`)
    expect(res.status).toBe(200)
  })

  it('sans token → 401 au format Nitro', async () => {
    const res = await request(app).get('/me')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: true, statusCode: 401, message: 'Non connecté.' })
  })

  it('session expirée → 401', async () => {
    const res = await request(app).get('/me').set('Cookie', `wt_session=${state.expiredToken}`)
    expect(res.status).toBe(401)
  })

  it('compte suspendu → 401 (traité comme non connecté)', async () => {
    const res = await request(app).get('/me').set('Authorization', `Bearer ${state.suspendedToken}`)
    expect(res.status).toBe(401)
  })

  it('rôle insuffisant (client sur /admin) → 403 avec message exact', async () => {
    const res = await request(app).get('/admin').set('Cookie', `wt_session=${state.token}`)
    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: true, statusCode: 403, message: 'Réservé à l’équipe WorkTogo.' })
  })
})
