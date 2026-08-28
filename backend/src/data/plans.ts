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

/**
 * Attributs **serveur** d'une formule (prix + durée), repris à l'identique de
 * `app/data/plans.ts` (#281) : le paiement d'abonnement (#34) débite `price` et
 * l'activation applique `durationDays`. Le contenu marketing (libellés, features,
 * i18n) reste côté app. À garder synchronisé avec `app/data/plans.ts`.
 */
export interface PlanConfig {
  slug: PlanSlug
  price: number
  durationDays: number
}

const PLAN_CONFIGS: Record<PlanSlug, PlanConfig> = {
  mensuel: { slug: 'mensuel', price: 5000, durationDays: 30 },
  trimestriel: { slug: 'trimestriel', price: 13500, durationDays: 90 },
  annuel: { slug: 'annuel', price: 48000, durationDays: 365 },
}

/** Config serveur d'une formule (prix/durée), ou `undefined` si le slug est inconnu. */
export function getPlanConfig(slug: string): PlanConfig | undefined {
  return PLAN_SLUGS.includes(slug as PlanSlug) ? PLAN_CONFIGS[slug as PlanSlug] : undefined
}
