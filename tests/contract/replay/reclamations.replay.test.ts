// @vitest-environment node
//
// Rejeu de contrat du domaine « réclamations » : mêmes requêtes envoyées à Nitro
// (`server/api/reclamations/**`) et à Express
// (`backend/src/routes/reclamations.routes.ts`), même base (ADR-0016). Exerce le
// cas nouveau d'**auth optionnelle par cookie** : un vrai cookie de session est
// envoyé aux deux runtimes, qui doivent réagir à l'identique.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import reclamationsPost from '~~/server/api/reclamations/index.post'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope, stripTopLevel } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let cookieHeader: string
let authedUserId: string

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'post', path: '/api/reclamations', handler: reclamationsPost },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const authed = await createAuthedUser('client')
  cookieHeader = authed.cookieHeader
  authedUserId = authed.user.id
}, 30_000)

afterAll(async () => {
  // Réclamations créées par le rejeu (des deux côtés) + compte de test.
  await prisma.complaint.deleteMany({ where: { contactEmail: { startsWith: '__replay_' } } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId: authedUserId } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: authedUserId } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

// La réponse `{ reference }` dérive de l'id créé : deux appels créent deux
// lignes distinctes → on neutralise `reference`, la forme doit être iso.
const normalizeReference = stripTopLevel(['reference'])

describe('Rejeu de contrat — POST /api/reclamations', () => {
  it('anonyme : forme de réponse iso (hors référence générée)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      {
        method: 'POST',
        path: '/api/reclamations',
        body: { category: 'technique', subject: 'Souci de connexion', message: 'Impossible de me connecter ce matin, merci.', contactEmail: '__replay_anon@test.tg' },
      },
      normalizeReference,
    )
    expect((n.body as { reference: string }).reference).toMatch(/^REF-[0-9A-F]{8}$/)
  })

  it('avec cookie de session : forme de réponse iso (compte rattaché des deux côtés)', async () => {
    await expectIso(
      targets,
      {
        method: 'POST',
        path: '/api/reclamations',
        headers: { cookie: cookieHeader },
        body: { category: 'compte', subject: 'Question sur mon compte', message: 'Je souhaite modifier mes informations de contact.', contactEmail: '__replay_authed@test.tg' },
      },
      normalizeReference,
    )
    // Confirme le rattachement réel (non observable dans la réponse) : les deux
    // lignes créées portent bien le userId de la session.
    const rows = await prisma.complaint.findMany({ where: { contactEmail: '__replay_authed@test.tg' } })
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.every((r) => r.userId === authedUserId)).toBe(true)
  })

  it.each([
    { category: 'inconnue', subject: 'Sujet valide', message: 'Message suffisamment long pour valider.', contactEmail: 'a@b.c' },
    { category: 'autre', subject: 'ab', message: 'Message suffisamment long pour valider.', contactEmail: 'a@b.c' },
    { category: 'autre', subject: 'Sujet valide', message: 'court', contactEmail: 'a@b.c' },
    { category: 'autre', subject: 'Sujet valide', message: 'Message suffisamment long pour valider.', contactEmail: '   ' },
  ])('corps invalide → 400 iso : %o', async (body) => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/reclamations', body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(400)
  })
})
