import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat de l'authentification (#23/#125/#126/#219) portée vers Express
 * (Phase 2, ADR-0016) : OTP, connexion/inscription, mot de passe, profil,
 * position et « Continuer avec Google ». Base de test ISOLÉE, contacts uniques
 * nettoyés en fin de suite. Aucun provider SMS/email/Google n'étant configuré,
 * l'OTP renvoie `devCode` et le parcours Google retombe sur `google_config`.
 */
describe('Contrat — authentification (/api/auth)', () => {
  const app = createServer()
  // Contacts (users + otpCode + verifiedContact) créés au fil des tests, purgés à la fin.
  const contacts = new Set<string>()
  const track = (contact: string) => (contacts.add(contact), contact)

  afterAll(async () => {
    const list = [...contacts]
    const users = await prisma.user.findMany({ where: { contact: { in: list } }, select: { id: true } })
    const ids = users.map((u) => u.id)
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: { in: ids } }, { referredId: { in: ids } }] } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.otpCode.deleteMany({ where: { contact: { in: list } } }).catch(() => undefined)
    await prisma.verifiedContact.deleteMany({ where: { contact: { in: list } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  /** Envoie un OTP puis le vérifie → dépose la preuve de vérification pour ce contact. */
  async function verifyContact(email: string): Promise<void> {
    const send = await request(app).post('/api/auth/otp/send').send({ method: 'email', value: email })
    expect(send.status).toBe(200)
    expect(send.body.devCode).toMatch(/^\d{6}$/)
    const verify = await request(app).post('/api/auth/otp/verify').send({ method: 'email', value: email, code: send.body.devCode })
    expect(verify.status).toBe(200)
    expect(verify.body).toEqual({ verified: true })
  }

  describe('OTP', () => {
    it('email invalide → 400', async () => {
      const res = await request(app).post('/api/auth/otp/send').send({ method: 'email', value: 'pas-un-email' })
      expect(res.status).toBe(400)
    })

    it('envoi puis renvoi immédiat → 429 (cooldown)', async () => {
      const email = track(`otp-${randomUUID()}@test.dev`)
      const first = await request(app).post('/api/auth/otp/send').send({ method: 'email', value: email })
      expect(first.status).toBe(200)
      const second = await request(app).post('/api/auth/otp/send').send({ method: 'email', value: email })
      expect(second.status).toBe(429)
    })

    it('code erroné → 400', async () => {
      const email = track(`otp-${randomUUID()}@test.dev`)
      await request(app).post('/api/auth/otp/send').send({ method: 'email', value: email })
      const res = await request(app).post('/api/auth/otp/verify').send({ method: 'email', value: email, code: '000000' })
      expect(res.status).toBe(400)
    })

    it('numéro invalide → 400', async () => {
      const res = await request(app).post('/api/auth/otp/send').send({ method: 'phone', value: '123' })
      expect(res.status).toBe(400)
    })

    it('téléphone : même contrat que l’email (devCode, vérification, normalisation +228)', async () => {
      // 8 chiffres aléatoires → contact normalisé "+228XXXXXXXX", suivi pour le nettoyage.
      const local = String(Math.floor(10000000 + Math.random() * 89999999))
      track(`+228${local}`)
      const send = await request(app).post('/api/auth/otp/send').send({ method: 'phone', value: `${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6)}` })
      expect(send.status).toBe(200)
      expect(send.body.expiresInSeconds).toBe(600)
      expect(send.body.devCode).toMatch(/^\d{6}$/)

      const verify = await request(app).post('/api/auth/otp/verify').send({ method: 'phone', value: local, code: send.body.devCode })
      expect(verify.status).toBe(200)
      expect(verify.body).toEqual({ verified: true })
    })
  })

  describe('POST /auth/session (inscription/connexion)', () => {
    it('contact non vérifié → 401', async () => {
      const email = track(`sess-${randomUUID()}@test.dev`)
      const res = await request(app).post('/api/auth/session').send({ method: 'email', value: email, role: 'client', username: 'ama', firstName: 'Ama', lastName: 'Koffi', location: 'Lomé' })
      expect(res.status).toBe(401)
    })

    it('inscription complète → 201 + user (passwordSet false)', async () => {
      const email = track(`sess-${randomUUID()}@test.dev`)
      await verifyContact(email)
      const res = await request(app).post('/api/auth/session').send({ method: 'email', value: email, role: 'client', username: 'ama', firstName: 'Ama', lastName: 'Koffi', location: 'Lomé' })
      expect(res.status).toBe(201)
      expect(res.body.created).toBe(true)
      expect(res.body.user).toMatchObject({ contact: email, role: 'client', firstName: 'Ama', passwordSet: false })
      // Cookie de session posé.
      expect(String(res.headers['set-cookie'])).toContain('wt_session=')
    })

    it('champs profil manquants à la création → 400', async () => {
      const email = track(`sess-${randomUUID()}@test.dev`)
      await verifyContact(email)
      const res = await request(app).post('/api/auth/session').send({ method: 'email', value: email, role: 'client' })
      expect(res.status).toBe(400)
    })

    it('compte finalisé : mot de passe requis puis vérifié (#126)', async () => {
      const email = track(`sess-${randomUUID()}@test.dev`)
      // Compte finalisé directement en base (passwordHash défini).
      const user = await prisma.user.create({ data: { contact: email, role: 'client', username: 'y', firstName: 'Yao', lastName: 'Doe', location: 'Lomé', passwordHash: await hashPassword('Secr3t!!') } })

      await verifyContact(email)
      const missing = await request(app).post('/api/auth/session').send({ method: 'email', value: email })
      expect(missing.status).toBe(400)

      await verifyContact(email)
      const wrong = await request(app).post('/api/auth/session').send({ method: 'email', value: email, password: 'mauvais' })
      expect(wrong.status).toBe(401)

      await verifyContact(email)
      const ok = await request(app).post('/api/auth/session').send({ method: 'email', value: email, password: 'Secr3t!!' })
      expect(ok.status).toBe(200)
      expect(ok.body.created).toBe(false)
      expect(ok.body.user.id).toBe(user.id)
    })

    it('compte suspendu → 403', async () => {
      const email = track(`sess-${randomUUID()}@test.dev`)
      await prisma.user.create({ data: { contact: email, role: 'client', username: 's', firstName: 'Sus', lastName: 'Pendu', location: 'Lomé', status: 'suspended', suspendedAt: new Date() } })
      await verifyContact(email)
      const res = await request(app).post('/api/auth/session').send({ method: 'email', value: email })
      expect(res.status).toBe(403)
    })
  })

  describe('Session, profil, position, mot de passe (compte connecté)', () => {
    // Compte de travail réutilisé par les cas protégés.
    let cookie = ''
    let userId = ''
    const email = `me-${randomUUID()}@test.dev`

    it('GET /auth/session sans session → 401', async () => {
      expect((await request(app).get('/api/auth/session')).status).toBe(401)
    })

    it('GET /auth/session/status sans session → { user: null }', async () => {
      const res = await request(app).get('/api/auth/session/status')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ user: null })
    })

    it('inscription → récupère le cookie de session', async () => {
      track(email)
      await verifyContact(email)
      const res = await request(app).post('/api/auth/session').send({ method: 'email', value: email, role: 'prestataire', username: 'kofi', firstName: 'Kofi', lastName: 'Mensah', location: 'Kara', latitude: 6.13, longitude: 1.22 })
      expect(res.status).toBe(201)
      userId = res.body.user.id
      expect(res.body.user).toMatchObject({ latitude: 6.13, longitude: 1.22 })
      cookie = String(res.headers['set-cookie']).split(';')[0]
    })

    it('GET /auth/session avec cookie → { user }', async () => {
      const res = await request(app).get('/api/auth/session').set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe(userId)
    })

    it('GET /auth/session/status avec cookie → { user }', async () => {
      const res = await request(app).get('/api/auth/session/status').set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe(userId)
    })

    it('POST /auth/password : refuse un mot de passe faible, accepte un fort', async () => {
      const weak = await request(app).post('/api/auth/password').set('Cookie', cookie).send({ password: 'abc', confirmPassword: 'abc' })
      expect(weak.status).toBe(400)

      const ok = await request(app).post('/api/auth/password').set('Cookie', cookie).send({ password: 'Secr3t!!', confirmPassword: 'Secr3t!!' })
      expect(ok.status).toBe(200)
      expect(ok.body.user.passwordSet).toBe(true)
    })

    it('POST /auth/password : compte finalisé exige le mot de passe actuel', async () => {
      const res = await request(app).post('/api/auth/password').set('Cookie', cookie).send({ password: 'Autre1!!', confirmPassword: 'Autre1!!' })
      expect(res.status).toBe(400)
      const wrong = await request(app).post('/api/auth/password').set('Cookie', cookie).send({ currentPassword: 'faux', password: 'Autre1!!', confirmPassword: 'Autre1!!' })
      expect(wrong.status).toBe(401)
    })

    it('PATCH /auth/profile met à jour le profil', async () => {
      const res = await request(app).patch('/api/auth/profile').set('Cookie', cookie).send({ username: 'kofi2', firstName: 'Kofi', lastName: 'Mensah', location: 'Sokodé' })
      expect(res.status).toBe(200)
      expect(res.body.user).toMatchObject({ username: 'kofi2', location: 'Sokodé' })
    })

    it('DELETE /auth/position efface les coordonnées', async () => {
      const res = await request(app).delete('/api/auth/position').set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body.user.latitude).toBeUndefined()
      expect(res.body.user.longitude).toBeUndefined()
      const row = await prisma.user.findUnique({ where: { id: userId } })
      expect(row?.latitude).toBeNull()
    })

    it('DELETE /auth/session déconnecte (cookie invalidé)', async () => {
      const res = await request(app).delete('/api/auth/session').set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
      const after = await request(app).get('/api/auth/session').set('Cookie', cookie)
      expect(after.status).toBe(401)
    })
  })

  describe('Google OAuth (sans configuration)', () => {
    // Garantit l'absence de config Google (un .env local pourrait en définir).
    const saved = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET }
    beforeAll(() => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET
    })
    afterAll(() => {
      if (saved.id !== undefined) process.env.GOOGLE_CLIENT_ID = saved.id
      if (saved.secret !== undefined) process.env.GOOGLE_CLIENT_SECRET = saved.secret
    })

    it('GET /auth/google → 302 vers le front avec google_config', async () => {
      const res = await request(app).get('/api/auth/google').set('Host', 'localhost:3100')
      expect(res.status).toBe(302)
      expect(res.headers.location).toBe('http://localhost:3100/auth?error=google_config')
    })

    it('GET /auth/google/callback → 302 vers le front avec google_config', async () => {
      const res = await request(app).get('/api/auth/google/callback').set('Host', 'localhost:3100')
      expect(res.status).toBe(302)
      expect(res.headers.location).toBe('http://localhost:3100/auth?error=google_config')
    })

    it('GET /auth/google/pending sans cookie → { pending: null }', async () => {
      const res = await request(app).get('/api/auth/google/pending')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ pending: null })
    })
  })

  describe('Google OAuth (annulation)', () => {
    const saved = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET }

    beforeAll(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
    })

    afterAll(() => {
      if (saved.id === undefined) delete process.env.GOOGLE_CLIENT_ID
      else process.env.GOOGLE_CLIENT_ID = saved.id
      if (saved.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET
      else process.env.GOOGLE_CLIENT_SECRET = saved.secret
    })

    it('GET /auth/google/callback annulé → 302 vers l’accueil avec le bon port', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback')
        .set('Host', 'localhost:3100')
        .query({ error: 'access_denied' })
      expect(res.status).toBe(302)
      expect(res.headers.location).toBe('http://localhost:3100/')
    })
  })

  describe('Google OAuth (fournisseur simulé)', () => {
    const saved = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET }

    beforeAll(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
    })

    afterAll(() => {
      vi.unstubAllGlobals()
      if (saved.id === undefined) delete process.env.GOOGLE_CLIENT_ID
      else process.env.GOOGLE_CLIENT_ID = saved.id
      if (saved.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET
      else process.env.GOOGLE_CLIENT_SECRET = saved.secret
    })

    it('compte Google existant → session ouverte puis redirection finale', async () => {
      const email = track(`google-fake-${randomUUID()}@test.dev`)
      await prisma.user.create({
        data: {
          contact: email,
          googleId: `google-fake-${randomUUID()}`,
          role: 'client',
          username: 'google-fake',
          firstName: 'Google',
          lastName: 'Test',
          location: 'Lomé',
        },
      })

      const user = await prisma.user.findUniqueOrThrow({ where: { contact: email } })
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'fake-access-token' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          sub: user.googleId,
          email,
          email_verified: true,
          given_name: 'Google',
          family_name: 'Test',
        }), { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      const agent = request.agent(app)
      const start = await agent.get('/api/auth/google').set('Host', 'localhost:3100')
      expect(start.status).toBe(302)
      expect(new URL(start.headers.location).searchParams.get('redirect_uri')).toBe(
        'http://localhost:3100/api/auth/google/callback',
      )
      const state = new URL(start.headers.location).searchParams.get('state')
      expect(state).toBeTruthy()

      const callback = await agent
        .get('/api/auth/google/callback')
        .set('Host', 'localhost:3100')
        .query({ code: 'fake-code', state })
      expect(callback.status).toBe(302)
      expect(callback.headers.location).toBe('http://localhost:3100/resultats')
      expect(fetchMock).toHaveBeenCalledTimes(2)

      const session = await agent.get('/api/auth/session')
      expect(session.status).toBe(200)
      expect(session.body.user).toMatchObject({ contact: email, role: 'client' })
    })
  })
})
