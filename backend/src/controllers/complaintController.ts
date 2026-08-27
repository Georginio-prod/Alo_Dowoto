import type { Request, Response } from 'express'
import { SESSION_COOKIE, getSessionUser } from '../services/authService'
import { complaintService } from '../services/complaintService'
import type { CreateComplaintInput } from '../validation/schemas/reclamations'

/**
 * Handler des réclamations. Porté iso depuis
 * `server/api/reclamations/index.post.ts` (ADR-0016). Corps déjà validé/normalisé
 * par `validateBody` en amont.
 *
 * **Auth optionnelle, cookie SEUL** : on rattache le compte si une session cookie
 * `wt_session` existe, sans jamais l'exiger — reproduit exactement le
 * `getCookie(event, SESSION_COOKIE)` du handler Nitro (donc **pas** le Bearer :
 * une requête mobile/dashboard portée par un jeton porteur reste anonyme ici,
 * comme aujourd'hui). Réponse : `{ reference }`.
 */
export async function createComplaint(req: Request, res: Response): Promise<void> {
  const { category, subject, message, contactEmail } = req.body as CreateComplaintInput

  const token = req.cookies?.[SESSION_COOKIE] as string | undefined
  const user = await getSessionUser(token)

  const complaint = await complaintService.addComplaint(
    category,
    subject,
    message,
    contactEmail,
    user?.id ?? null,
  )
  res.json({ reference: complaintService.complaintReference(complaint) })
}
