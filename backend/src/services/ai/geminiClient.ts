import type { AiClient, AiCompletionParams, AiCompletionResult, AiToolCallLog, AiToolDefinition } from './types'

/**
 * Adaptateur Google Gemini (#geoloc, 2.3), pendant iso de `./claudeClient` pour
 * le fournisseur `gemini` (voir `./index`). But : disposer d'un assistant IA
 * **gratuit** (palier gratuit de l'API Gemini) sans rien changer d'autre — même
 * interface `AiClient`, mêmes outils, même prompt système, même mode dégradé.
 * Appel serveur uniquement (la clé API n'est jamais exposée), via `fetch` direct
 * sur l'API REST `generateContent` (aucune dépendance SDK ajoutée, comme Claude).
 * Implémente la même boucle agentique d'utilisation d'outils « à la main »
 * (generateContent → functionCall → exécution → nouveau tour).
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Garde-fou contre une boucle d'outils qui ne se termine jamais (iso Claude). */
const MAX_TOOL_ITERATIONS = 4
const MAX_OUTPUT_TOKENS = 1024

interface GeminiFunctionCall {
  name: string
  args?: Record<string, unknown>
}
interface GeminiPart {
  text?: string
  functionCall?: GeminiFunctionCall
  functionResponse?: { name: string; response: Record<string, unknown> }
}
interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
}

/**
 * Traduit un schéma d'outil (JSON Schema, types en minuscule) vers le `Schema`
 * attendu par Gemini (énumération `type` en MAJUSCULES). Récursif sur
 * `properties` et `items`. Seuls les champs utilisés par nos outils sont portés.
 */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const type = schema.type
  if (typeof type === 'string') out.type = type.toUpperCase()
  if (typeof schema.description === 'string') out.description = schema.description
  if (Array.isArray(schema.required)) out.required = schema.required
  if (Array.isArray(schema.enum)) out.enum = schema.enum

  if (schema.properties && typeof schema.properties === 'object') {
    const props = schema.properties as Record<string, Record<string, unknown>>
    out.properties = Object.fromEntries(
      Object.entries(props).map(([key, value]) => [key, toGeminiSchema(value)]),
    )
  }
  if (schema.items && typeof schema.items === 'object') {
    out.items = toGeminiSchema(schema.items as Record<string, unknown>)
  }
  return out
}

function toFunctionDeclarations(tools: AiToolDefinition[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: toGeminiSchema(tool.inputSchema),
  }))
}

/** Gemini exige un objet pour `functionResponse.response` : on enveloppe si besoin. */
function wrapToolResult(result: unknown): Record<string, unknown> {
  return result !== null && typeof result === 'object' && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : { result }
}

export function createGeminiClient(apiKey: string, models: { light: string; heavy: string }): AiClient {
  return {
    providerId: 'gemini',

    async complete(params: AiCompletionParams): Promise<AiCompletionResult> {
      const { systemPrompt, userMessage, history, tools, executeTool, modelTier } = params
      const model = modelTier === 'heavy' ? models.heavy : models.light
      const url = `${GEMINI_BASE}/${model}:generateContent`

      const functionDeclarations = toFunctionDeclarations(tools)

      // Historique → alternance user/model attendue par Gemini ('assistant' → 'model').
      const contents: GeminiContent[] = [
        ...history.map<GeminiContent>((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        { role: 'user', parts: [{ text: userMessage }] },
      ]

      const toolCalls: AiToolCallLog[] = []

      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            // Clé en en-tête (jamais dans l'URL, pour ne pas fuiter dans les logs).
            'x-goog-api-key': apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            ...(functionDeclarations.length > 0 ? { tools: [{ functionDeclarations }] } : {}),
            generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
          }),
        })
        // Échec API (quota gratuit dépassé, clé invalide, réseau) → lève : le
        // handler bascule en mode dégradé (FAQ), jamais d'erreur brute au client.
        if (!response.ok) throw new Error(`Gemini a répondu ${response.status}`)
        const data = (await response.json()) as GeminiResponse

        if (data.promptFeedback?.blockReason) {
          throw new Error(`Gemini a bloqué la requête (${data.promptFeedback.blockReason})`)
        }
        const parts = data.candidates?.[0]?.content?.parts
        if (!parts) throw new Error('Gemini a renvoyé une réponse vide')

        const functionCalls = parts.filter(
          (part): part is GeminiPart & { functionCall: GeminiFunctionCall } => part.functionCall !== undefined,
        )

        if (functionCalls.length === 0) {
          const text = parts
            .filter((part): part is GeminiPart & { text: string } => typeof part.text === 'string')
            .map((part) => part.text)
            .join('\n')
          return { text, toolCalls }
        }

        // Le tour du modèle (blocs functionCall inclus) est réinjecté tel quel
        // avant les résultats — l'API l'exige pour associer chaque réponse à son appel.
        contents.push({ role: 'model', parts })

        const responseParts: GeminiPart[] = []
        for (const part of functionCalls) {
          const name = part.functionCall.name
          const input = part.functionCall.args ?? {}
          const result = await executeTool(name, input)
          toolCalls.push({ toolName: name, input, result })
          responseParts.push({ functionResponse: { name, response: wrapToolResult(result) } })
        }
        contents.push({ role: 'user', parts: responseParts })
      }

      return {
        text: "Je n'ai pas réussi à traiter votre demande après plusieurs essais. Reformulez-la, ou contactez le support WorkTogo.",
        toolCalls,
      }
    },
  }
}
