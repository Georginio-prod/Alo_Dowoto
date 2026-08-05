import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listAdminReviews } from '~~/server/utils/adminReviewStore'

/** Avis, signalés en tête (#dashboard-admin, module 8). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const query = getQuery(event)
  const reviews = await listAdminReviews(query.flagged === '1')
  return { reviews }
})
