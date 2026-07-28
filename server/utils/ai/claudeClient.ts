import Anthropic from '@anthropic-ai/sdk'
import type { AiClient, AiCompletionParams, AiCompletionResult, AiToolCallLog } from '~~/server/utils/ai/types'

/** Garde-fou contre une boucle d'outils qui ne se termine jamais (modèle qui rappelle un outil indéfiniment). */
const MAX_TOOL_ITERATIONS = 4
const MAX_TOKENS = 1024

/**
 * Adaptateur Anthropic (#geoloc, 2.3) — seul fichier de ce module à importer
 * `@anthropic-ai/sdk`. Implémente la boucle agentique d'utilisation d'outils
 * « à la main » (create → tool_use → exécution → nouveau tour) plutôt que de
 * s'appuyer sur un exécuteur haut niveau : ce projet exécute des fonctions
 * internes (recherche de prestataires, FAQ), pas des outils génériques, et
 * cette boucle explicite reste simple à auditer/tester sans clé API réelle
 * (voir tests/ai/claudeClient.test.ts, qui mocke le client Anthropic).
 */
export function createClaudeClient(apiKey: string, models: { light: string; heavy: string }): AiClient {
  const client = new Anthropic({ apiKey })

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

      const messages: Anthropic.MessageParam[] = history.map((message) => ({
        role: message.role,
        content: message.content,
      }))

      const toolCalls: AiToolCallLog[] = []

      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const response = await client.messages.create({
          model,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages,
          tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        })

        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        )

        if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
          const text = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
          return { text, toolCalls }
        }

        // Le tour de l'assistant (y compris ses blocs tool_use) doit être
        // réinjecté tel quel avant les résultats d'outils — l'API Anthropic
        // l'exige pour associer chaque tool_result à son tool_use.
        messages.push({ role: 'assistant', content: response.content })

        const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
        for (const toolUse of toolUseBlocks) {
          const input = (toolUse.input ?? {}) as Record<string, unknown>
          const result = await executeTool(toolUse.name, input)
          toolCalls.push({ toolName: toolUse.name, input, result })
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          })
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
