import { requireSessionUser } from '~~/server/utils/requireSessionUser'
import { resetProgress } from '~~/server/utils/tutorialProgressStore'

/** Réinitialise toute la progression de tutoriels de l'utilisateur connecté. */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  await resetProgress(user.id)
  return { ok: true }
})
