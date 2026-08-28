/**
 * Soumission de la vérification d'identité (#180+1) : ouverte à tout compte
 * connecté, chercheur ou prestataire. Facultative à l'inscription — voir
 * AuthIdentityStep.vue — mais requise avant la première demande d'un
 * chercheur (server/api/requests) et avant qu'un prestataire puisse être
 * contacté (server/api/conversations).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const { idCardImage, passportPhotoImage } = await readSchemaBody(event, submitVerificationSchema)

  const verification = await submitVerification(user.id, idCardImage, passportPhotoImage)
  return { verified: true, submittedAt: verification.submittedAt }
})
