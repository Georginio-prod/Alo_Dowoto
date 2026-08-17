import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listContournementSignals, listMissionDropSignals, listProviderRiskScores } from '~~/server/utils/adminAntiCircumventionStore'
import { getDemoBrowseWithoutPaySignals } from '~~/server/utils/adminAntiCircumventionDemo'

/** Tableau de bord anti-désintermédiation (#dashboard-admin, module 9). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const [signals, missionDrops, riskScores] = await Promise.all([
    listContournementSignals(),
    listMissionDropSignals(),
    listProviderRiskScores(),
  ])

  return { signals, missionDrops, riskScores, browseWithoutPaySignals: getDemoBrowseWithoutPaySignals() }
})
