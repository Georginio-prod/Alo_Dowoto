/**
 * Publication d'une demande de service par un client vérifié (#43).
 * La validation du corps est déclarative et testée (server/utils/apiValidation.ts,
 * createServiceRequestSchema) — les messages d'erreur sont inchangés.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  if (user.role !== 'client') {
    forbidden('Réservé aux comptes client.')
  }
  if (!(await isVerified(user.id))) {
    forbidden("Vérifiez votre identité avant de publier votre première demande (carte d'identité + photo passeport).")
  }

  const body = await readSchemaBody(event, createServiceRequestSchema)

  const request = await createServiceRequest(user.id, {
    title: body.title,
    skills: body.skills,
    description: body.description,
    budgetMax: body.budgetMax,
    urgency: body.urgency,
    location: body.location,
    sector: body.sector,
  })

  setResponseStatus(event, 201)
  return { request, matches: getStoredMatches(request.id) ?? [] }
})
