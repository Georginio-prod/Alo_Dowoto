/**
 * Couche d'abstraction IA (#geoloc, 2.3), portée iso depuis
 * `server/utils/ai/types.ts` (ADR-0016) : aucune route ne dépend d'un SDK
 * fournisseur — tout passe par ces interfaces. `./claudeClient` est le seul
 * fichier qui connaît l'API Anthropic.
 */

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/** Un appel d'outil effectivement exécuté, pour audit/affichage. */
export interface AiToolCallLog {
  toolName: string
  input: Record<string, unknown>
  result: unknown
}

export type ModelTier = 'light' | 'heavy'

export interface AiCompletionParams {
  systemPrompt: string
  history: AiMessage[]
  tools: AiToolDefinition[]
  /** Exécute un outil par son nom et renvoie un résultat sérialisable — jamais d'invention côté modèle. */
  executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>
  modelTier: ModelTier
}

export interface AiCompletionResult {
  text: string
  toolCalls: AiToolCallLog[]
}

/** Contrat que tout adaptateur fournisseur (Claude, Mistral, GPT...) doit implémenter. */
export interface AiClient {
  readonly providerId: string
  complete(params: AiCompletionParams): Promise<AiCompletionResult>
}
