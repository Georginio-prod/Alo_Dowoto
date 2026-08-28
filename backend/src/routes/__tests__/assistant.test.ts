import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat de l'assistant IA (#geoloc, 2.2) porté vers Express (Phase 2,
 * ADR-0016). En test, aucune clé Anthropic n'est configurée → l'assistant est en
 * **mode dégradé** (recherche FAQ déterministe), le seul chemin testable sans
 * LLM. On couvre : validation, repli FAQ (match / absence de match) et limitation
 * de débit (fenêtre persistée `AiRateWindow`). Le chemin modèle (clé configurée)
 * est porté verbatim mais non testable de façon déterministe (non couvert).
 */
describe('Contrat — assistant IA (/api/assistant/chat)', () => {
  const app = createServer()
  const usedKeys = ['anon:inconnu', 'anon:203.0.113.77']

  afterAll(async () => {
    await prisma.aiRateWindow.deleteMany({ where: { key: { in: usedKeys } } }).catch(() => undefined)
  })

  describe('validation', () => {
    it('message vide → 400', async () => {
      expect((await request(app).post('/api/assistant/chat').send({ message: '   ' })).status).toBe(400)
    })

    it('message trop long → 400', async () => {
      expect((await request(app).post('/api/assistant/chat').send({ message: 'a'.repeat(2001) })).status).toBe(400)
    })
  })

  describe('mode dégradé (aucun fournisseur configuré)', () => {
    it('question FAQ → repli FAQ formaté (degraded, sans outil)', async () => {
      const res = await request(app).post('/api/assistant/chat').send({ message: 'Comment contacter un prestataire et payer en sécurité ?' })
      expect(res.status).toBe(200)
      expect(res.body.degraded).toBe(true)
      expect(res.body.toolCalls).toEqual([])
      expect(typeof res.body.text).toBe('string')
      // Réponses FAQ formatées en markdown (`**question**`).
      expect(res.body.text).toContain('**')
    })

    it('question sans correspondance FAQ → message par défaut (degraded)', async () => {
      const res = await request(app).post('/api/assistant/chat').send({ message: 'zzxqv wkqp' })
      expect(res.status).toBe(200)
      expect(res.body.degraded).toBe(true)
      expect(res.body.text).toContain("n'est pas disponible")
    })
  })

  describe('limitation de débit (8 / fenêtre)', () => {
    it('la 9e requête d\'une même clé est bloquée (429)', async () => {
      const ip = '203.0.113.77'
      const statuses: number[] = []
      for (let i = 0; i < 9; i++) {
        const res = await request(app).post('/api/assistant/chat').set('X-Forwarded-For', ip).send({ message: 'bonjour' })
        statuses.push(res.status)
      }
      // Les 8 premières passent (200), la 9e est limitée (429).
      expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true)
      expect(statuses[8]).toBe(429)
    })
  })
})
