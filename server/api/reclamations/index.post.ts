import { COMPLAINT_CATEGORIES, type ComplaintCategory } from '~/data/complaintCategories'

interface CreateComplaintBody {
  category?: string
  subject?: string
  message?: string
  contactEmail?: string
}

const VALID_CATEGORIES: ComplaintCategory[] = COMPLAINT_CATEGORIES.map((option) => option.value)

/**
 * Ouvert à tout visiteur (pas de session requise) : un problème d'accès au
 * compte ou d'inscription peut justement empêcher d'être connecté au
 * moment de la réclamation.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<CreateComplaintBody>(event)

  const rawCategory = body?.category
  const category = VALID_CATEGORIES.includes(rawCategory as ComplaintCategory)
    ? (rawCategory as ComplaintCategory)
    : undefined
  const subject = body?.subject?.trim() ?? ''
  const message = body?.message?.trim() ?? ''
  const contactEmail = body?.contactEmail?.trim() ?? ''

  if (!category) {
    badRequest('Sélectionnez une catégorie de réclamation.')
  }
  if (subject.length < 3 || subject.length > 120) {
    badRequest('Le sujet doit contenir entre 3 et 120 caractères.')
  }
  if (message.length < 10 || message.length > 2000) {
    badRequest('Le message doit contenir entre 10 et 2000 caractères.')
  }
  if (!contactEmail) {
    badRequest('Indiquez une adresse email ou un numéro de téléphone de contact.')
  }

  // Réclamation ouverte à tout visiteur (voir plus haut) : on rattache le
  // compte si une session existe, sans jamais l'exiger.
  const token = getCookie(event, SESSION_COOKIE)
  const user = getSessionUser(token)

  const complaint = addComplaint(category, subject, message, contactEmail, user?.id ?? null)
  return { reference: complaintReference(complaint) }
})
