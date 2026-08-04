import { executeAssistantTool, ASSISTANT_TOOLS } from '~~/server/utils/ai/tools'
import { getAssistantClient } from '~~/server/utils/ai'
import { buildAssistantSystemPrompt } from '~~/server/utils/ai/systemPrompt'
import { pickModelTier } from '~~/server/utils/ai/router'
import { appendConversationTurn, getConversationHistory } from '~~/server/utils/aiConversationStore'
import { getCachedAssistantAnswer, setCachedAssistantAnswer } from '~~/server/utils/aiFaqCache'
import { isRateLimited } from '~~/server/utils/aiRateLimiter'
import { assistantChatSchema } from '~~/server/utils/apiValidationAssistant'
import { getSessionUser, SESSION_COOKIE } from '~~/server/utils/userStore'
import type { AiToolCallLog } from '~~/server/utils/ai/types'

/**
 * POST /api/assistant/chat (#geoloc, 2.2) — appel serveur uniquement, la clé
 * API n'est jamais exposée au client. Accessible aux visiteurs non connectés
 * (l'assistant doit répondre aux questions générales sans compte) : la clé
 * de rate-limit/historique retombe sur l'adresse IP dans ce cas.
 *
 * Mode dégradé (aucun fournisseur IA configuré, voir server/utils/ai/index.ts) :
 * ne renvoie jamais d'erreur brute — retombe sur une recherche déterministe
 * dans la FAQ (le seul outil qui ne dépend d'aucun modèle), avec
 * `degraded: true` pour que le widget affiche un message clair et un accès
 * à la recherche classique.
 */
export default defineEventHandler(async (event) => {
  const body = await readSchemaBody(event, assistantChatSchema)

  const token = getCookie(event, SESSION_COOKIE)
  const sessionUser = await getSessionUser(token)
  const rateLimitKey = sessionUser?.id ?? `anon:${getHeader(event, 'x-forwarded-for') ?? 'inconnu'}`

  if (await isRateLimited(rateLimitKey)) {
    setResponseStatus(event, 429)
    return {
      degraded: false,
      text: "Vous avez envoyé beaucoup de messages en peu de temps. Patientez une minute avant de réessayer.",
      toolCalls: [],
    }
  }

  const client = getAssistantClient()
  if (!client) {
    const faqResult = await executeAssistantTool('consulterFAQ', { question: body.message }) as
      { trouve: boolean, reponses?: { question: string, answer: string }[] }

    const text = faqResult.trouve && faqResult.reponses?.length
      ? faqResult.reponses.map((item) => `**${item.question}**\n${item.answer}`).join('\n\n')
      : "L'assistant IA n'est pas disponible pour le moment. Utilisez la recherche classique ou consultez la FAQ."

    return { degraded: true, text, toolCalls: [] }
  }

  const cached = getCachedAssistantAnswer(body.message)
  if (cached) {
    return { degraded: false, text: cached, toolCalls: [], fromCache: true }
  }

  const history = getConversationHistory(rateLimitKey)
  const modelTier = pickModelTier(body.message)

  async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    // Les coordonnées du chercheur (position détectée côté client) complètent
    // silencieusement rechercherPrestataires quand le modèle ne les a pas
    // reprises lui-même dans ses paramètres d'appel.
    if (name === 'rechercherPrestataires' && body.latitude !== undefined && body.longitude !== undefined) {
      return executeAssistantTool(name, { latitude: body.latitude, longitude: body.longitude, ...input })
    }
    return executeAssistantTool(name, input)
  }

  let result: { text: string, toolCalls: AiToolCallLog[] }
  try {
    result = await client.complete({
      systemPrompt: buildAssistantSystemPrompt(),
      history,
      tools: ASSISTANT_TOOLS,
      executeTool,
      modelTier,
    })
  } catch {
    // Panne du fournisseur IA (quota, réseau, clé invalide...) : mode
    // dégradé identique à l'absence de configuration, jamais d'erreur brute.
    const faqResult = await executeAssistantTool('consulterFAQ', { question: body.message }) as
      { trouve: boolean, reponses?: { question: string, answer: string }[] }
    const text = faqResult.trouve && faqResult.reponses?.length
      ? faqResult.reponses.map((item) => `**${item.question}**\n${item.answer}`).join('\n\n')
      : "L'assistant IA est momentanément indisponible. Utilisez la recherche classique ou consultez la FAQ."
    return { degraded: true, text, toolCalls: [] }
  }

  appendConversationTurn(rateLimitKey, { role: 'user', content: body.message }, { role: 'assistant', content: result.text })

  if (result.toolCalls.length === 0) {
    setCachedAssistantAnswer(body.message, result.text)
  }

  return { degraded: false, text: result.text, toolCalls: result.toolCalls }
})
