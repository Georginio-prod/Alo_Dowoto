import express, { type Express } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { errorHandler } from '../../middleware/errorHandler'
import { HttpError } from '../../utils/apiError'
import { requiredTrimmed } from '../primitives'
import { parseSchema, validateBody, validateQuery } from '../validate'

/**
 * Vérifie que le pont de validation reproduit le contrat Nitro : premier message
 * du schéma → 400 `{ error, statusCode, message }`, et normalisation (trim,
 * defaults) appliquée avant le handler. Purement en mémoire — aucune base.
 */
const schema = z.object({
  title: requiredTrimmed('Le titre est requis.'),
  tags: z.array(z.string()).optional().default([]),
})

describe('parseSchema', () => {
  it('retourne la valeur normalisée quand le corps est valide', () => {
    const value = parseSchema(schema, { title: '  Plombier  ' })
    expect(value).toEqual({ title: 'Plombier', tags: [] })
  })

  it('lève un HttpError 400 portant le premier message du schéma', () => {
    try {
      parseSchema(schema, { title: '   ' })
      expect.unreachable('parseSchema aurait dû lever')
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError)
      expect((err as HttpError).statusCode).toBe(400)
      expect((err as HttpError).message).toBe('Le titre est requis.')
    }
  })

  it('message générique quand le corps est absent/non-objet', () => {
    try {
      parseSchema(schema, undefined)
      expect.unreachable('parseSchema aurait dû lever')
    } catch (err) {
      expect((err as HttpError).statusCode).toBe(400)
    }
  })
})

describe('validateBody / validateQuery (middlewares)', () => {
  function buildApp(): Express {
    const app = express()
    app.use(express.json())
    app.post('/things', validateBody(schema), (req, res) => {
      res.json({ received: req.body })
    })
    app.get('/things', validateQuery(z.object({ q: requiredTrimmed('q requis.') })), (req, res) => {
      res.json({ q: (req.query as { q: string }).q })
    })
    app.use(errorHandler)
    return app
  }

  it('normalise req.body puis passe au handler', async () => {
    const res = await request(buildApp()).post('/things').send({ title: '  Élec  ' })
    expect(res.status).toBe(200)
    expect(res.body.received).toEqual({ title: 'Élec', tags: [] })
  })

  it('rejette un corps invalide en 400 au format Nitro', async () => {
    const res = await request(buildApp()).post('/things').send({ title: '' })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: true, statusCode: 400, message: 'Le titre est requis.' })
  })

  it('valide et normalise req.query', async () => {
    const res = await request(buildApp()).get('/things').query({ q: '  toit  ' })
    expect(res.status).toBe(200)
    expect(res.body.q).toBe('toit')
  })

  it('rejette une query invalide en 400', async () => {
    const res = await request(buildApp()).get('/things')
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: true, statusCode: 400 })
  })
})
