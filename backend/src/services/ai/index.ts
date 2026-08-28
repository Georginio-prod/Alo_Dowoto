import { createClaudeClient } from './claudeClient'
import type { AiClient } from './types'

/**
 * Point d'entrée du module IA (#geoloc, 2.2/2.3), porté iso depuis
 * `server/utils/ai/index.ts` (ADR-0016) — le reste de l'application ne connaît
 * que `getAssistantClient`, jamais un SDK fournisseur particulier.
 *
 * Configuration (voir .env.example) :
 * - AI_PROVIDER       : fournisseur actif ('anthropic' par défaut, seul implémenté).
 * - ANTHROPIC_API_KEY : clé API Anthropic. Sans elle, `getAssistantClient()`
 *                       renvoie `null` → l'assistant bascule en mode dégradé
 *                       (recherche FAQ déterministe) plutôt qu'une erreur.
 * - AI_MODEL_LIGHT / AI_MODEL_HEAVY : modèles léger/lourd (voir `./router`).
 */

const DEFAULT_LIGHT_MODEL = 'claude-haiku-4-5-20251001'
const DEFAULT_HEAVY_MODEL = 'claude-sonnet-5'

/** Vrai si un fournisseur IA est configuré (réponse directe possible plutôt que mode dégradé). */
export function isAssistantConfigured(): boolean {
  return getAssistantClient() !== null
}

/** `null` si aucun fournisseur n'est configuré (voir mode dégradé). */
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
