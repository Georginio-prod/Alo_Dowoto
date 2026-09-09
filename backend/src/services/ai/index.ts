import { createClaudeClient } from './claudeClient'
import { createGeminiClient } from './geminiClient'
import type { AiClient } from './types'

/**
 * Point d'entrée du module IA (#geoloc, 2.2/2.3), porté iso depuis
 * `server/utils/ai/index.ts` (ADR-0016) — le reste de l'application ne connaît
 * que `getAssistantClient`, jamais un SDK fournisseur particulier.
 *
 * Configuration (voir backend/.env.example) :
 * - AI_PROVIDER : fournisseur actif — 'gemini' (gratuit, par défaut) ou 'anthropic'.
 *
 * Fournisseur 'gemini' (palier gratuit de l'API Google Gemini) :
 * - GEMINI_API_KEY : clé API Google AI Studio. Sans elle, `getAssistantClient()`
 *                    renvoie `null` → l'assistant bascule en mode dégradé
 *                    (recherche FAQ déterministe) plutôt qu'une erreur.
 * - GEMINI_MODEL_LIGHT / GEMINI_MODEL_HEAVY : modèles léger/lourd (voir `./router`).
 *
 * Fournisseur 'anthropic' (payant à l'usage) :
 * - ANTHROPIC_API_KEY : clé API Anthropic (même logique de mode dégradé sans clé).
 * - AI_MODEL_LIGHT / AI_MODEL_HEAVY : modèles léger/lourd.
 */

const DEFAULT_CLAUDE_LIGHT = 'claude-haiku-4-5-20251001'
const DEFAULT_CLAUDE_HEAVY = 'claude-sonnet-5'
// Modèles du palier gratuit de Gemini (rapides, suffisants pour FAQ + recommandations).
const DEFAULT_GEMINI_LIGHT = 'gemini-2.5-flash-lite'
const DEFAULT_GEMINI_HEAVY = 'gemini-2.5-flash'

/** Vrai si un fournisseur IA est configuré (réponse directe possible plutôt que mode dégradé). */
export function isAssistantConfigured(): boolean {
  return getAssistantClient() !== null
}

/** `null` si aucun fournisseur n'est configuré (voir mode dégradé). */
export function getAssistantClient(): AiClient | null {
  const provider = process.env.AI_PROVIDER || 'gemini'

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null
    return createGeminiClient(apiKey, {
      light: process.env.GEMINI_MODEL_LIGHT || DEFAULT_GEMINI_LIGHT,
      heavy: process.env.GEMINI_MODEL_HEAVY || DEFAULT_GEMINI_HEAVY,
    })
  }

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return null
    return createClaudeClient(apiKey, {
      light: process.env.AI_MODEL_LIGHT || DEFAULT_CLAUDE_LIGHT,
      heavy: process.env.AI_MODEL_HEAVY || DEFAULT_CLAUDE_HEAVY,
    })
  }

  return null
}
