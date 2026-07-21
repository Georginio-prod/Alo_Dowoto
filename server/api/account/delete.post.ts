/**
 * Droit à l'effacement (#286, RGPD/audit sécurité) : anonymise le compte
 * connecté (voir `anonymizeUser`, server/utils/userStore.ts) et efface ses
 * images de vérification d'identité — la catégorie de donnée la plus
 * sensible de l'application. L'historique financier (paiements,
 * abonnements) est conservé, comme l'exige la politique de confidentialité
 * (obligations comptables/fiscales), mais n'est plus rattachable à une
 * identité réelle.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  deleteVerification(user.id)
  await anonymizeUser(user.id)

  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
