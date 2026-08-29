import type { Request } from 'express'
import { notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { getConversationById, isConversationParticipant, type Conversation } from '../services/conversationService'
import type { User } from '@prisma/client'

/**
 * Résout la conversation d'une route `:id` et vérifie l'appartenance de
 * l'utilisateur connecté — partagé par les deux contrôleurs de conversation
 * (messagerie et séquestre). On ne distingue jamais "inexistante" de "pas la
 * vôtre" : 404 dans les deux cas (pas de fuite d'existence). `side` exige en
 * plus un côté précis (client ou prestataire) quand la route le réserve.
 */
export async function requireParticipantConversation(
  req: Request,
  side?: 'client' | 'provider',
): Promise<{ user: User; conversation: Conversation }> {
  const user = authUser(req)
  const id = req.params.id
  const conversation = id ? await getConversationById(id) : null
  if (!conversation || !isConversationParticipant(conversation, user.id)) notFound('Conversation introuvable.')
  if (side === 'client' && conversation.clientId !== user.id) notFound('Conversation introuvable.')
  if (side === 'provider' && conversation.providerId !== user.id) notFound('Conversation introuvable.')
  return { user, conversation }
}
