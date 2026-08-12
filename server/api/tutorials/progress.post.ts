import { requireSessionUser } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { markSectionSchema } from '~~/server/utils/apiValidationTutorials'
import { markSectionSeen } from '~~/server/utils/tutorialProgressStore'

/** Marque une section de tutoriel comme vue pour l'utilisateur connecté. */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readSchemaBody(event, markSectionSchema)
  await markSectionSeen(user.id, body.sectionId)
  setResponseStatus(event, 201)
  return { ok: true }
})
