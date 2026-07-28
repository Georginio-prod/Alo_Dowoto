// @vitest-environment node
//
// Le SDK Anthropic refuse de s'instancier dans un environnement
// « browser-like » (garde-fou anti-fuite de clé API, voir @anthropic-ai/sdk) —
// or l'environnement par défaut de ce projet (happy-dom, vitest.config.ts)
// expose justement `window`/`document`. Ce fichier construit un vrai client
// (sans mock), donc a besoin de l'environnement Node comme les tests HTTP.
import { afterEach, describe, expect, it } from 'vitest'
import { getAssistantClient, isAssistantConfigured } from '~~/server/utils/ai'

/**
 * Sélection du fournisseur IA (#geoloc, 2.3) — sans clé configurée,
 * getAssistantClient() doit renvoyer null (mode dégradé), jamais lever une
 * exception : c'est l'état par défaut de ce projet tant qu'aucune clé n'est
 * fournie (voir server/api/assistant/chat.post.ts).
 */
describe('ai/index — sélection du fournisseur', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('n’est pas configuré sans ANTHROPIC_API_KEY', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(isAssistantConfigured()).toBe(false)
    expect(getAssistantClient()).toBeNull()
  })

  it('est configuré dès qu’ANTHROPIC_API_KEY est présente (fournisseur par défaut)', () => {
    delete process.env.AI_PROVIDER
    process.env.ANTHROPIC_API_KEY = 'test-key'
    expect(isAssistantConfigured()).toBe(true)
    expect(getAssistantClient()?.providerId).toBe('anthropic')
  })

  it('n’est pas configuré pour un fournisseur non implémenté', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.AI_PROVIDER = 'mistral'
    expect(getAssistantClient()).toBeNull()
  })
})
