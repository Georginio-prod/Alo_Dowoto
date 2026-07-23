/**
 * Ouvert à tout visiteur (pas de session requise) : un problème d'accès au
 * compte ou d'inscription peut justement empêcher d'être connecté au
 * moment de la réclamation.
 */
export default defineEventHandler(async (event) => {
  const { category, subject, message, contactEmail } = await readSchemaBody(event, createComplaintSchema)

  // Réclamation ouverte à tout visiteur (voir plus haut) : on rattache le
  // compte si une session existe, sans jamais l'exiger.
  const token = getCookie(event, SESSION_COOKIE)
  const user = await getSessionUser(token)

  const complaint = await addComplaint(category, subject, message, contactEmail, user?.id ?? null)
  return { reference: complaintReference(complaint) }
})
