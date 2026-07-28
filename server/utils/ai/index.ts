import { createClaudeClient } from '~~/server/utils/ai/claudeClient'
import type { AiClient } from '~~/server/utils/ai/types'

/**
 * Point d'entrée du module IA (#geoloc, 2.2/2.3) — le reste de l'application
 * (route API, widget) ne connaît que `isAssistantConfigured`/`getAssistantClient`,
 * jamais un SDK de fournisseur particulier (voir server/utils/ai/types.ts).
 *
 * Configuration (voir .env.example) :
 * - AI_PROVIDER       : fournisseur actif. Seul 'anthropic' est implémenté
 *                       pour l'instant (valeur par défaut si omise) —
 *                       ajouter un fournisseur revient à écrire un fichier
 *                       `xxxClient.ts` implémentant `AiClient` et à
 *                       l'ajouter ci-dessous, sans toucher au reste.
 * - ANTHROPIC_API_KEY : clé API Anthropic (console.anthropic.com). Sans
 *                       elle, `getAssistantClient()` renvoie `null` et
 *                       l'assistant bascule en mode dégradé (recherche FAQ
 *                       déterministe, voir server/api/assistant/chat.post.ts)
 *                       plutôt que de renvoyer une erreur.
 * - AI_MODEL_LIGHT    : modèle pour les questions simples (FAQ/navigation).
 * - AI_MODEL_HEAVY    : modèle pour les recommandations complexes (voir
 *                       server/utils/ai/router.ts).
 */

const DEFAULT_LIGHT_MODEL = 'claude-haiku-4-5-20251001'
const DEFAULT_HEAVY_MODEL = 'claude-sonnet-5'

/** Vrai si un fournisseur IA est configuré — l'assistant peut répondre en direct plutôt qu'en mode dégradé. */
export function isAssistantConfigured(): boolean {
  return getAssistantClient() !== null
}

/** `null` si aucun fournisseur n'est configuré (voir mode dégradé ci-dessus). */
export function getAssistantClient(): AiClient | null {
  const provider = process.env.AI_PROVIDER || 'anthropic'
  if (provider !== 'anthropic') return null

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  return createClaudeClient(apiKey, {
    light: process.env.AI_MODEL_LIGHT || DEFAULT_LIGHT_MODEL,
    heavy: process.env.AI_MODEL_HEAVY || DEFAULT_HEAVY_MODEL,
  })
}
