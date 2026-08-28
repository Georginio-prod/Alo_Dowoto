import type { AiClient, AiCompletionParams, AiCompletionResult, AiToolCallLog } from './types'

/**
 * Adaptateur Anthropic (#geoloc, 2.3), porté depuis `server/utils/ai/claudeClient.ts`
 * (ADR-0016). Seule adaptation vs Nitro : appel **direct** à l'API Messages via
 * `fetch` (au lieu de `@anthropic-ai/sdk`) — le backend reste sans dépendance SDK,
 * et le SDK n'était de toute façon qu'un mince habillage du même endpoint JSON.
 * Implémente la boucle agentique d'utilisation d'outils « à la main »
 * (create → tool_use → exécution → nouveau tour).
 */

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
/** Garde-fou contre une boucle d'outils qui ne se termine jamais. */
const MAX_TOOL_ITERATIONS = 4
const MAX_TOKENS = 1024

interface AnthropicTextBlock {
  type: 'text'
  text: string
}
interface AnthropicToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input?: Record<string, unknown>
}
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock | { type: string; [k: string]: unknown }

interface AnthropicResponse {
  content: AnthropicContentBlock[]
  stop_reason: string | null
}

/** Contenu d'un message renvoyé à l'API : texte brut (historique) ou blocs (tours suivants). */
type MessageContent = string | AnthropicContentBlock[]

export function createClaudeClient(apiKey: string, models: { light: string; heavy: string }): AiClient {
  return {
    providerId: 'anthropic',

    async complete(params: AiCompletionParams): Promise<AiCompletionResult> {
      const { systemPrompt, history, tools, executeTool, modelTier } = params
      const model = modelTier === 'heavy' ? models.heavy : models.light

      const anthropicTools = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }))

      const messages: { role: 'user' | 'assistant'; content: MessageContent }[] = history.map((message) => ({
        role: message.role,
        content: message.content,
      }))

      const toolCalls: AiToolCallLog[] = []

      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const response = await fetch(ANTHROPIC_ENDPOINT, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            messages,
            ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
          }),
        })
        // Échec API (quota, clé invalide, réseau) → lève : le handler bascule en
        // mode dégradé (FAQ), jamais d'erreur brute renvoyée au client.
        if (!response.ok) throw new Error(`Anthropic a répondu ${response.status}`)
        const data = (await response.json()) as AnthropicResponse

        const toolUseBlocks = data.content.filter(
          (block): block is AnthropicToolUseBlock => block.type === 'tool_use',
        )

        if (data.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
          const text = data.content
            .filter((block): block is AnthropicTextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
          return { text, toolCalls }
        }

        // Le tour de l'assistant (blocs tool_use inclus) est réinjecté tel quel
        // avant les résultats d'outils — l'API l'exige pour associer chaque
        // tool_result à son tool_use.
        messages.push({ role: 'assistant', content: data.content })

        const toolResultBlocks: AnthropicContentBlock[] = []
        for (const toolUse of toolUseBlocks) {
          const input = (toolUse.input ?? {}) as Record<string, unknown>
          const result = await executeTool(toolUse.name, input)
          toolCalls.push({ toolName: toolUse.name, input, result })
          toolResultBlocks.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) })
        }
        messages.push({ role: 'user', content: toolResultBlocks })
      }

      return {
        text: "Je n'ai pas réussi à traiter votre demande après plusieurs essais. Reformulez-la, ou contactez le support WorkTogo.",
        toolCalls,
      }
    },
  }
}
