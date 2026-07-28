import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreate = vi.fn()

// Une fonction classique (pas une fléchée) : seule une vraie fonction est
// utilisable comme constructeur via `new` — voir claudeClient.ts, qui
// instancie `new Anthropic(...)`.
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mockCreate } }
  }),
}))

const { createClaudeClient } = await import('~~/server/utils/ai/claudeClient')

/**
 * Boucle agentique d'utilisation d'outils de l'adaptateur Claude (#geoloc,
 * 2.2/2.3) — le SDK Anthropic est mocké (aucune clé API réelle disponible
 * dans ce bac à sable) : cette suite vérifie que la boucle create → tool_use
 * → exécution → nouveau tour est correctement câblée, pas le comportement du
 * modèle lui-même.
 */
describe('createClaudeClient', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('renvoie directement le texte quand le modèle ne demande aucun outil', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Bonjour, comment puis-je vous aider ?' }],
    })

    const client = createClaudeClient('fake-key', { light: 'model-light', heavy: 'model-heavy' })
    const executeTool = vi.fn()
    const result = await client.complete({
      systemPrompt: 'system',
      history: [{ role: 'user', content: 'Bonjour' }],
      tools: [],
      executeTool,
      modelTier: 'light',
    })

    expect(result.text).toBe('Bonjour, comment puis-je vous aider ?')
    expect(result.toolCalls).toEqual([])
    expect(executeTool).not.toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({ model: 'model-light' })
  })

  it('utilise le modèle « heavy » demandé et exécute l’outil avant de renvoyer la réponse finale', async () => {
    mockCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'tool-1', name: 'rechercherPrestataires', input: { metier: 'plombier' } }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Voici un plombier disponible.' }],
      })

    const executeTool = vi.fn().mockResolvedValue({ resultats: [{ id: 'p09', nom: 'Kokou B.' }] })
    const client = createClaudeClient('fake-key', { light: 'model-light', heavy: 'model-heavy' })
    const result = await client.complete({
      systemPrompt: 'system',
      history: [{ role: 'user', content: 'Je cherche un plombier' }],
      tools: [{ name: 'rechercherPrestataires', description: 'x', inputSchema: { type: 'object', properties: {} } }],
      executeTool,
      modelTier: 'heavy',
    })

    expect(executeTool).toHaveBeenCalledWith('rechercherPrestataires', { metier: 'plombier' })
    expect(result.text).toBe('Voici un plombier disponible.')
    expect(result.toolCalls).toEqual([
      { toolName: 'rechercherPrestataires', input: { metier: 'plombier' }, result: { resultats: [{ id: 'p09', nom: 'Kokou B.' }] } },
    ])
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(mockCreate.mock.calls[1]?.[0]).toMatchObject({ model: 'model-heavy' })
  })

  it('s’arrête après le nombre maximal d’itérations plutôt que de boucler indéfiniment', async () => {
    mockCreate.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tool-x', name: 'consulterFAQ', input: { question: 'x' } }],
    })
    const executeTool = vi.fn().mockResolvedValue({ trouve: false })

    const client = createClaudeClient('fake-key', { light: 'model-light', heavy: 'model-heavy' })
    const result = await client.complete({
      systemPrompt: 'system',
      history: [{ role: 'user', content: 'question' }],
      tools: [{ name: 'consulterFAQ', description: 'x', inputSchema: { type: 'object', properties: {} } }],
      executeTool,
      modelTier: 'light',
    })

    expect(result.text).toContain("n'ai pas réussi")
    expect(mockCreate.mock.calls.length).toBeLessThanOrEqual(4)
  })
})
