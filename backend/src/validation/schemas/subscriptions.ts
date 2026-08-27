import { z } from 'zod'

/**
 * Schéma des abonnements. Porté **verbatim** depuis
 * `server/utils/apiValidationMisc.ts#planSlugSchema` (ADR-0016) : formule
 * identique pour `POST /api/subscriptions` et `POST /api/subscriptions/trial`
 * (`findPlan` valide ensuite la valeur réelle dans le controller).
 */
export const planSlugSchema = z.object({
  plan: z.string().optional().default(''),
})

export type PlanSlugInput = z.infer<typeof planSlugSchema>
