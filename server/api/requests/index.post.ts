import type { Urgency } from '~~/server/utils/matchingEngine'

interface CreateRequestBody {
  title?: string
  skills?: string[]
  description?: string
  budgetMax?: number
  urgency?: Urgency
  location?: string
  sector?: string
}

const VALID_URGENCY = new Set<Urgency>(['immediate', 'semaine', 'flexible'])

export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  if (user.role !== 'client') {
    forbidden('Réservé aux comptes client.')
  }

  const body = await readBody<CreateRequestBody>(event)

  const title = body?.title?.trim()
  if (!title) {
    badRequest('Le titre de la demande est requis.')
  }

  const skills = (body?.skills ?? []).map((skill) => skill.trim()).filter(Boolean)
  if (skills.length === 0) {
    badRequest('Indiquez au moins une compétence recherchée.')
  }

  if (typeof body?.budgetMax !== 'number' || !Number.isFinite(body.budgetMax) || body.budgetMax <= 0) {
    badRequest('Budget maximum invalide.')
  }

  if (!body?.urgency || !VALID_URGENCY.has(body.urgency)) {
    badRequest('Urgence invalide.')
  }

  const location = body?.location?.trim()
  if (!location) {
    badRequest('La localisation est requise.')
  }

  const request = createServiceRequest(user.id, {
    title,
    skills,
    description: body?.description?.trim() ?? '',
    budgetMax: body.budgetMax,
    urgency: body.urgency,
    location,
    sector: body?.sector,
  })

  setResponseStatus(event, 201)
  return { request, matches: getStoredMatches(request.id) ?? [] }
})
