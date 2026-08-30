import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'
import { ADMIN_PERMISSIONS } from '../../services/adminPermissionsService'

/**
 * Contrat du sous-lot admin 1 — auth/session/permissions/équipe, porté iso
 * depuis `server/api/admin/{login,logout,session,admins,team}` (ADR-0016).
 * Le dashboard porte le jeton en `Authorization: Bearer`. Base de test ISOLÉE,
 * comptes uniques, super-admin (permissions NULL) créé directement en base.
 */
describe('Contrat — admin auth & permissions (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const superEmail = `super-${suffix}@test.tg`
  const PASSWORD = 'secret123'
  const state = { superId: '', superToken: '', clientId: '', createdAdminIds: [] as string[] }

  const bearer = (t: string) => `Bearer ${t}`

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({
      data: { contact: superEmail, role: 'admin', passwordHash: hash, adminPermissions: null, username: 'super', firstName: 'Super', lastName: 'Admin', location: 'Lomé' },
    })
    state.superId = superAdmin.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `c${suffix}` } })
    state.clientId = client.id
  })

  afterAll(async () => {
    const ids = [state.superId, state.clientId, ...state.createdAdminIds]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
    await prisma.aiRateWindow.deleteMany({ where: { key: { startsWith: 'admin-login:' } } }).catch(() => undefined)
  })

  describe('Connexion', () => {
    it('POST /admin/login sans corps → 400', async () => {
      const res = await request(app).post('/api/admin/login').send({})
      expect(res.status).toBe(400)
    })

    it('POST /admin/login mauvais mot de passe → 401 générique', async () => {
      const res = await request(app).post('/api/admin/login').send({ email: superEmail, password: 'mauvais' })
      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Identifiants invalides.')
    })

    it('POST /admin/login valide → 200, jeton + super-admin', async () => {
      const res = await request(app).post('/api/admin/login').send({ email: superEmail, password: PASSWORD })
      expect(res.status).toBe(200)
      expect(typeof res.body.token).toBe('string')
      expect(res.body.isSuperAdmin).toBe(true)
      expect(res.body.permissions).toBeNull()
      state.superToken = res.body.token
    })
  })

  describe('Session', () => {
    it('GET /admin/session sans jeton → 401', async () => {
      expect((await request(app).get('/api/admin/session')).status).toBe(401)
    })

    it('GET /admin/session avec jeton admin → 200', async () => {
      const res = await request(app).get('/api/admin/session').set('Authorization', bearer(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('admin')
      expect(res.body.isSuperAdmin).toBe(true)
    })
  })

  describe('Gestion des admins (admins.manage)', () => {
    it('GET /admin/admins (super-admin) → 200, items + catalogue complet', async () => {
      const res = await request(app).get('/api/admin/admins').set('Authorization', bearer(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.catalog).toHaveLength(ADMIN_PERMISSIONS.length)
      const self = res.body.items.find((i: { id: string }) => i.id === state.superId)
      expect(self.isSelf).toBe(true)
      expect(self.isSuperAdmin).toBe(true)
    })

    it('POST /admin/admins mot de passe trop court → 400', async () => {
      const res = await request(app).post('/api/admin/admins').set('Authorization', bearer(state.superToken)).send({ email: `x-${suffix}@test.tg`, password: 'court' })
      expect(res.status).toBe(400)
    })

    it('POST /admin/admins → 200, crée un admin restreint qui peut se connecter mais n’a pas admins.manage', async () => {
      const email = `mod-${suffix}@test.tg`
      const created = await request(app)
        .post('/api/admin/admins')
        .set('Authorization', bearer(state.superToken))
        .send({ email, password: 'modpass12', firstName: 'Mod', permissions: ['dashboard.view', 'users.view'] })
      expect(created.status).toBe(200)
      expect(created.body.admin.permissions).toEqual(['dashboard.view', 'users.view'])
      state.createdAdminIds.push(created.body.admin.id)

      const login = await request(app).post('/api/admin/login').send({ email, password: 'modpass12' })
      expect(login.status).toBe(200)
      expect(login.body.isSuperAdmin).toBe(false)

      // Un admin restreint sans `admins.manage` → 403 sur la gestion des admins.
      const denied = await request(app).get('/api/admin/admins').set('Authorization', bearer(login.body.token))
      expect(denied.status).toBe(403)
      expect(denied.body.message).toBe('Permission insuffisante pour cette action.')
    })
  })

  describe('Équipe', () => {
    it('GET /admin/team (compte client) → 403 réservé aux administrateurs', async () => {
      const client = await prisma.user.findUnique({ where: { id: state.clientId } })
      const token = randomUUID()
      await prisma.session.create({ data: { token, userId: client!.id, expiresAt: new Date(Date.now() + 3_600_000) } })
      const res = await request(app).get('/api/admin/team').set('Authorization', bearer(token))
      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Réservé aux administrateurs.')
    })

    it('POST /admin/team/promote → 200, promeut un compte et trace l’action', async () => {
      const res = await request(app)
        .post('/api/admin/team/promote')
        .set('Authorization', bearer(state.superToken))
        .send({ userId: state.clientId, level: 'moderateur' })
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('admin')
      expect(res.body.user.adminLevel).toBe('moderateur')

      const audit = await prisma.auditLog.findFirst({ where: { actorId: state.superId, action: 'team.promote', targetId: state.clientId } })
      expect(audit).toBeTruthy()
    })
  })

  describe('Déconnexion', () => {
    it('POST /admin/logout → 200 puis le jeton n’est plus valide', async () => {
      const login = await request(app).post('/api/admin/login').send({ email: superEmail, password: PASSWORD })
      const token = login.body.token
      expect((await request(app).post('/api/admin/logout').set('Authorization', bearer(token))).status).toBe(200)
      expect((await request(app).get('/api/admin/session').set('Authorization', bearer(token))).status).toBe(401)
    })
  })
})
