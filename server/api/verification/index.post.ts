interface SubmitVerificationBody {
  idCardImage?: string
  passportPhotoImage?: string
}

/**
 * Soumission de la vérification d'identité (#180+1) : ouverte à tout compte
 * connecté, chercheur ou prestataire. Facultative à l'inscription — voir
 * AuthIdentityStep.vue — mais requise avant la première demande d'un
 * chercheur (server/api/requests) et avant qu'un prestataire puisse être
 * contacté (server/api/conversations).
 */
export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  const body = await readBody<SubmitVerificationBody>(event)

  const idCardImage = body?.idCardImage
  const passportPhotoImage = body?.passportPhotoImage

  if (!isValidIdentityImage(idCardImage)) {
    badRequest("La photo de la carte d'identité est requise (JPEG ou PNG, 5 Mo maximum).")
  }
  if (!isValidIdentityImage(passportPhotoImage)) {
    badRequest('La photo passeport (fond blanc, format international) est requise (JPEG ou PNG, 5 Mo maximum).')
  }

  const verification = submitVerification(user.id, idCardImage, passportPhotoImage)
  return { verified: true, submittedAt: verification.submittedAt }
})
