import { afterEach, describe, expect, it } from 'vitest'
import { isValidWebhookSignature, signWebhookBody } from '~~/server/utils/webhookSignature'

const RAW_BODY = JSON.stringify({ paymentId: 'pay_1', status: 'success' })

/**
 * Sauvegarde/restaure les variables d'environnement touchées par chaque test
 * pour ne pas fuiter d'état d'un cas à l'autre (secret / NODE_ENV).
 */
const originalSecret = process.env.PAYMENT_WEBHOOK_SECRET
const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  if (originalSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET
  else process.env.PAYMENT_WEBHOOK_SECRET = originalSecret
  process.env.NODE_ENV = originalNodeEnv
})

describe('webhookSignature (#34/#193)', () => {
  it('valide une signature produite avec le même secret', () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'un-secret-de-test'
    const signature = signWebhookBody(RAW_BODY)
    expect(isValidWebhookSignature(RAW_BODY, signature)).toBe(true)
  })

  it('rejette une signature absente ou incorrecte', () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'un-secret-de-test'
    expect(isValidWebhookSignature(RAW_BODY, undefined)).toBe(false)
    expect(isValidWebhookSignature(RAW_BODY, 'deadbeef')).toBe(false)
  })

  it('rejette une signature produite avec un autre secret', () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'secret-A'
    const signature = signWebhookBody(RAW_BODY)
    process.env.PAYMENT_WEBHOOK_SECRET = 'secret-B'
    expect(isValidWebhookSignature(RAW_BODY, signature)).toBe(false)
  })

  it('hors production, retombe sur le secret de développement si aucun secret défini', () => {
    delete process.env.PAYMENT_WEBHOOK_SECRET
    process.env.NODE_ENV = 'test'
    expect(() => signWebhookBody(RAW_BODY)).not.toThrow()
  })

  it('en production sans secret, refuse de signer (secret de dev interdit)', () => {
    delete process.env.PAYMENT_WEBHOOK_SECRET
    process.env.NODE_ENV = 'production'
    expect(() => signWebhookBody(RAW_BODY)).toThrow(/PAYMENT_WEBHOOK_SECRET/)
    expect(() => isValidWebhookSignature(RAW_BODY, 'anything')).toThrow(/PAYMENT_WEBHOOK_SECRET/)
  })

  it('en production avec secret défini, signe et valide normalement', () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'secret-de-prod'
    process.env.NODE_ENV = 'production'
    const signature = signWebhookBody(RAW_BODY)
    expect(isValidWebhookSignature(RAW_BODY, signature)).toBe(true)
  })
})
