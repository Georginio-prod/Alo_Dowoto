import { requireSessionUser } from '~~/server/utils/requireSessionUser'
import { listSeenSections } from '~~/server/utils/tutorialProgressStore'

/** Sections de tutoriel déjà vues par l'utilisateur connecté (sync inter-appareils). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  return { seen: await listSeenSections(user.id) }
})
