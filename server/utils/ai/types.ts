/**
 * Couche d'abstraction IA (#geoloc, 2.3) : aucune route ne doit dépendre
 * directement d'un SDK de fournisseur (`@anthropic-ai/sdk` ou autre) — tout
 * passe par ces interfaces, pour pouvoir changer de fournisseur (Mistral,
 * GPT, un modèle open-source hébergé...) sans réécrire l'assistant, comme
 * exigé par le besoin. `server/utils/ai/claudeClient.ts` est le seul fichier
 * qui connaît l'existence d'Anthropic.
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

/** Un appel d'outil effectivement exécuté, pour audit/affichage (ex. widget : « recherche effectuée »). */
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
  /** Exécute un outil par son nom et renvoie un résultat sérialisable — jamais d'invention côté modèle, voir server/utils/ai/tools.ts. */
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
