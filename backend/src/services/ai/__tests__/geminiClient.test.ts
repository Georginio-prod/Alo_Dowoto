import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGeminiClient } from '../geminiClient'
import type { AiToolDefinition } from '../types'

/**
 * Contrat de l'adaptateur Gemini (#geoloc, 2.3) — pendant de `claudeClient`.
 * `fetch` est mocké : aucune clé, aucun réseau, aucun coût. On couvre la boucle
 * agentique (functionCall → exécution d'outil → nouveau tour → texte final), la
 * conversion de schéma JSON→Gemini (types en MAJUSCULES) et le repli sur erreur.
 */

const TOOLS: AiToolDefinition[] = [
  {
    name: 'rechercherPrestataires',
    description: 'Recherche de prestataires.',
    inputSchema: {
      type: 'object',
      properties: { metier: { type: 'string', description: 'Métier recherché.' } },
      required: ['metier'],
    },
  },
]

function geminiTextResponse(text: string) {
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) }
}
function geminiFunctionCallResponse(name: string, args: Record<string, unknown>) {
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ functionCall: { name, args } }] } }] }) }
}

afterEach(() => vi.restoreAllMocks())

describe('createGeminiClient', () => {
  it('renvoie directement le texte quand le modèle n\'appelle aucun outil', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(geminiTextResponse('Bonjour !'))
    vi.stubGlobal('fetch', fetchMock)

    const client = createGeminiClient('clé-test', { light: 'gemini-2.5-flash-lite', heavy: 'gemini-2.5-flash' })
    const result = await client.complete({
      systemPrompt: 'sys', userMessage: 'salut', history: [],
      tools: TOOLS, executeTool: async () => ({}), modelTier: 'light',
    })

    expect(result.text).toBe('Bonjour !')
    expect(result.toolCalls).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse((options as { body: string }).body)
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'salut' }] }])
  })

  it('exécute l\'outil demandé puis renvoie la réponse finale (boucle agentique)', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(geminiFunctionCallResponse('rechercherPrestataires', { metier: 'plomberie' }))
      .mockResolvedValueOnce(geminiTextResponse('Voici un plombier.'))
    vi.stubGlobal('fetch', fetchMock)
    const executeTool = vi.fn().mockResolvedValue({ resultats: [{ id: 'p1' }] })

    const client = createGeminiClient('clé-test', { light: 'gemini-2.5-flash-lite', heavy: 'gemini-2.5-flash' })
    const result = await client.complete({
      systemPrompt: 'sys', userMessage: 'un plombier ?', history: [],
      tools: TOOLS, executeTool, modelTier: 'heavy',
    })

    expect(executeTool).toHaveBeenCalledWith('rechercherPrestataires', { metier: 'plomberie' })
    expect(result.text).toBe('Voici un plombier.')
    expect(result.toolCalls).toEqual([{ toolName: 'rechercherPrestataires', input: { metier: 'plomberie' }, result: { resultats: [{ id: 'p1' }] } }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('utilise le modèle « heavy » et convertit le schéma (type en MAJUSCULES)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(geminiTextResponse('ok'))
    vi.stubGlobal('fetch', fetchMock)

    const client = createGeminiClient('clé-test', { light: 'gemini-2.5-flash-lite', heavy: 'gemini-2.5-flash' })
    await client.complete({
      systemPrompt: 'sys', userMessage: 'x', history: [],
      tools: TOOLS, executeTool: async () => ({}), modelTier: 'heavy',
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('gemini-2.5-flash:generateContent')
    const body = JSON.parse((options as { body: string }).body)
    const schema = body.tools[0].functionDeclarations[0].parameters
    expect(schema.type).toBe('OBJECT')
    expect(schema.properties.metier.type).toBe('STRING')
    // La clé passe par l'en-tête, jamais l'URL (pas de fuite dans les logs).
    expect(url).not.toContain('clé-test')
    expect((options as { headers: Record<string, string> }).headers['x-goog-api-key']).toBe('clé-test')
  })

  it('lève sur réponse HTTP non-ok (→ mode dégradé côté handler)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }))
    const client = createGeminiClient('clé-test', { light: 'gemini-2.5-flash-lite', heavy: 'gemini-2.5-flash' })
    await expect(client.complete({
      systemPrompt: 'sys', userMessage: 'x', history: [],
      tools: TOOLS, executeTool: async () => ({}), modelTier: 'light',
    })).rejects.toThrow('429')
  })
})
