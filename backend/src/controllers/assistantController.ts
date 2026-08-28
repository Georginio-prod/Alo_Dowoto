import type { Request, Response } from 'express'
import type { z } from 'zod'
import { extractSessionToken, getSessionUser } from '../services/authService'
import { getAssistantClient } from '../services/ai'
import { ASSISTANT_TOOLS, executeAssistantTool } from '../services/ai/tools'
import { buildAssistantSystemPrompt } from '../services/ai/systemPrompt'
import { pickModelTier } from '../services/ai/router'
import { appendConversationTurn, getConversationHistory } from '../services/aiConversationService'
import { getCachedAssistantAnswer, setCachedAssistantAnswer } from '../services/aiFaqCacheService'
import { aiRateLimitService } from '../services/aiRateLimitService'
import type { AiToolCallLog } from '../services/ai/types'
import type { assistantChatSchema } from '../validation/schemas/assistant'

/**
 * Assistant IA (#geoloc, 2.2), porté iso depuis `server/api/assistant/chat.post.ts`
 * (ADR-0016). Appel serveur uniquement (la clé API n'est jamais exposée).
 * Accessible aux visiteurs non connectés (clé de rate-limit/historique = IP).
 * Mode dégradé (aucun fournisseur configuré OU panne) : jamais d'erreur brute,
 * repli sur une recherche FAQ déterministe avec `degraded: true`.
 */

type FaqResult = { trouve: boolean; reponses?: { question: string; answer: string }[] }

/** Construit une réponse dégradée depuis la FAQ (aucun modèle requis). */
async function faqFallback(message: string, emptyText: string): Promise<string> {
  const faqResult = (await executeAssistantTool('consulterFAQ', { question: message })) as FaqResult
  return faqResult.trouve && faqResult.reponses?.length
    ? faqResult.reponses.map((item) => `**${item.question}**\n${item.answer}`).join('\n\n')
    : emptyText
}

/** POST /api/assistant/chat → { degraded, text, toolCalls, fromCache? }. */
export async function assistantChat(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof assistantChatSchema>

  const sessionUser = await getSessionUser(extractSessionToken(req))
  const xff = req.headers['x-forwarded-for']
  const anonId = (Array.isArray(xff) ? xff[0] : xff) ?? 'inconnu'
  const rateLimitKey = sessionUser?.id ?? `anon:${anonId}`

  if (await aiRateLimitService.isRateLimited(rateLimitKey)) {
    res.status(429).json({
      degraded: false,
      text: 'Vous avez envoyé beaucoup de messages en peu de temps. Patientez une minute avant de réessayer.',
      toolCalls: [],
    })
    return
  }

  const client = getAssistantClient()
  if (!client) {
    const text = await faqFallback(
      body.message,
      "L'assistant IA n'est pas disponible pour le moment. Utilisez la recherche classique ou consultez la FAQ.",
    )
    res.json({ degraded: true, text, toolCalls: [] })
    return
  }

  const cached = getCachedAssistantAnswer(body.message)
  if (cached) {
    res.json({ degraded: false, text: cached, toolCalls: [], fromCache: true })
    return
  }

  const history = getConversationHistory(rateLimitKey)
  const modelTier = pickModelTier(body.message)

  async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    // Les coordonnées du chercheur complètent silencieusement rechercherPrestataires
    // quand le modèle ne les a pas reprises dans ses paramètres (iso Nitro).
    if (name === 'rechercherPrestataires' && body.latitude !== undefined && body.longitude !== undefined) {
      return executeAssistantTool(name, { latitude: body.latitude, longitude: body.longitude, ...input })
    }
    return executeAssistantTool(name, input)
  }

  let result: { text: string; toolCalls: AiToolCallLog[] }
  try {
    result = await client.complete({
      systemPrompt: buildAssistantSystemPrompt(),
      history,
      tools: ASSISTANT_TOOLS,
      executeTool,
      modelTier,
    })
  } catch {
    // Panne du fournisseur (quota, réseau, clé invalide) : mode dégradé.
    const text = await faqFallback(
      body.message,
      "L'assistant IA est momentanément indisponible. Utilisez la recherche classique ou consultez la FAQ.",
    )
    res.json({ degraded: true, text, toolCalls: [] })
    return
  }

  appendConversationTurn(rateLimitKey, { role: 'user', content: body.message }, { role: 'assistant', content: result.text })

  // Seuls les échanges sans outil (FAQ/navigation pure) sont mis en cache.
  if (result.toolCalls.length === 0) {
    setCachedAssistantAnswer(body.message, result.text)
  }

  res.json({ degraded: false, text: result.text, toolCalls: result.toolCalls })
}
