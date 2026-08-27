/**
 * Formules d'abonnement — **slugs** repris de `app/data/plans.ts` (le backend est
 * standalone, n'importe pas le code de l'app). Seuls les slugs sont nécessaires
 * ici : les routes valident la formule et stockent son slug ; le contenu
 * marketing (prix, features, i18n) reste côté app. À garder synchronisé.
 */
export type PlanSlug = 'mensuel' | 'trimestriel' | 'annuel'

export const PLAN_SLUGS: readonly PlanSlug[] = ['mensuel', 'trimestriel', 'annuel']

/** Iso `app/data/plans.ts#findPlan` : renvoie le slug valide, ou `undefined`. */
export function findPlan(slug: string): PlanSlug | undefined {
  return PLAN_SLUGS.find((s) => s === slug)
}
