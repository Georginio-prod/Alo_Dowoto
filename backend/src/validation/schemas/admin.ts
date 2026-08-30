import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schémas zod des endpoints d'administration `/api/admin/**`, portés iso depuis
 * `server/api/admin/**` (ADR-0016). Seuls les endpoints qui valident via zod
 * côté Nitro ont un schéma ici ; login et création d'admin parsent le corps à
 * la main (mêmes messages, même ordre de branches) dans le contrôleur.
 */

/** Corps de `POST /api/admin/team/promote` (#dashboard-admin, module 12). */
export const promoteAdminSchema = z.object({
  userId: requiredTrimmed("L'identifiant du compte est requis."),
  level: z.enum(['admin', 'moderateur', 'support']),
})

/** Motif obligatoire (refus KYC, résolution de litige, remboursement…). Iso `reasonBodySchema`. */
export const reasonBodySchema = z.object({
  reason: requiredTrimmed('Le motif est obligatoire.'),
})

/** Motif facultatif (annulation, note libre). Iso `optionalReasonBodySchema`. */
export const optionalReasonBodySchema = z.object({
  reason: z.string().trim().optional(),
})

/** Note facultative accompagnant une validation KYC. Iso `kycApproveSchema`. */
export const kycApproveSchema = z.object({
  note: z.string().trim().optional(),
})

/** Marquage « à risque » d'un compte (avec note interne facultative). Iso `riskFlagSchema`. */
export const riskFlagSchema = z.object({
  riskFlag: z.boolean({ error: 'Valeur invalide.' }),
  note: z.string().trim().optional(),
})

/** Type de transaction à rejouer (`POST /admin/payments/:id/retry`). Iso `retrySchema`. */
export const retryTransactionSchema = z.object({
  kind: z.enum(['subscription_payment', 'wallet_recharge'], { error: 'Type invalide.' }),
})

/** Durée (jours) d'une prolongation d'abonnement. Iso `subscriptionExtendSchema`. */
export const subscriptionExtendSchema = z.object({
  durationDays: z
    .number({ error: 'Durée invalide.' })
    .refine((value) => Number.isInteger(value) && value > 0 && value <= 3650, 'Durée invalide.'),
})

/** Remboursement manuel d'un chercheur (montant facultatif, motif obligatoire). Iso `manualRefundSchema`. */
export const manualRefundSchema = z.object({
  amount: z
    .number({ error: 'Montant invalide.' })
    .refine((value) => Number.isFinite(value) && value > 0, 'Montant invalide.')
    .optional(),
  reason: requiredTrimmed('Le motif du remboursement est obligatoire.'),
})

/** Niveau d'accès d'un membre de l'équipe admin. Iso le schéma local de `team/[id]/level`. */
export const teamLevelSchema = z.object({
  level: z.enum(['admin', 'moderateur', 'support'], { error: 'Niveau invalide.' }),
})

// ---- Catalogue (#dashboard-admin, modules 7 & 10) : formules, coupons, réglages, catégories, contenu ----

/** Bascule d'activation partagée (formule, coupon). */
export const toggleActiveSchema = z.object({ active: z.boolean() })

/** Création d'une formule d'abonnement configurable. Iso `planSchema`. */
export const planCreateSchema = z.object({
  slug: requiredTrimmed('Le slug est requis.'),
  name: requiredTrimmed('Le nom est requis.'),
  priceAmount: z.number().int().positive(),
  durationDays: z.number().int().positive(),
  commissionRate: z.number().min(0).max(1),
  features: z.string().trim(),
})

/** Mise à jour partielle d'une formule. Iso `patchSchema` (plans). */
export const planPatchSchema = z.object({
  name: z.string().trim().optional(),
  priceAmount: z.number().int().positive().optional(),
  durationDays: z.number().int().positive().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  features: z.string().trim().optional(),
})

/** Création d'un code promo. Iso `couponSchema`. */
export const couponCreateSchema = z.object({
  code: requiredTrimmed('Le code est requis.'),
  discountType: z.enum(['percent', 'amount']),
  discountValue: z.number().int().positive(),
  expiresAt: z.number().optional(),
  usageLimit: z.number().int().positive().optional(),
})

/** Réglages généraux de la plateforme (patch partiel). Iso `settingsSchema`. */
export const settingsPatchSchema = z.object({
  geoRadiusKm: z.number().int().positive().optional(),
  autoValidationDelayHours: z.number().int().positive().optional(),
  retractationDelayHours: z.number().int().positive().optional(),
  currency: z.string().trim().optional(),
  language: z.string().trim().optional(),
  minAdvanceAmount: z.number().int().positive().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
})

/** Création d'une catégorie de service. Iso `sectorSchema`. */
export const sectorCreateSchema = z.object({
  slug: requiredTrimmed('Le slug est requis.'),
  name: requiredTrimmed('Le nom est requis.'),
  emoji: z.string().trim().default('🛠️'),
  color: z.string().trim().default('#14A800'),
  ink: z.string().trim().default('#0F2318'),
})

/** Mise à jour d'une catégorie (nom/activation/ordre/icône). Iso `patchSchema` (categories). */
export const sectorPatchSchema = z.object({
  name: z.string().trim().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  emoji: z.string().trim().optional(),
})

/** Ajout d'une question de fiche préalable. Iso le schéma local de `categories/[id]/questions`. */
export const prealableQuestionSchema = z.object({
  label: requiredTrimmed('La question est requise.'),
  required: z.boolean().default(true),
})

/** Upsert d'un bloc de contenu éditorial. Iso le schéma local de `content`. */
export const siteContentSchema = z.object({
  key: requiredTrimmed('La clé est requise.'),
  label: requiredTrimmed('Le libellé est requis.'),
  value: z.string().trim(),
})

// ---- Litiges / avis / missions (#dashboard-admin, modules 4, 6, 8) ----

/** Message direct de l'équipe à un utilisateur (annonce ciblée, contact auteur d'avis). Iso `adminMessageSchema`. */
export const adminMessageSchema = z.object({
  subject: requiredTrimmed("L'objet du message est requis."),
  body: requiredTrimmed('Le message est requis.'),
})

/** Résolution manuelle d'un litige (client / prestataire / partage). Iso le schéma local de `disputes/[id]/resolve`. */
export const disputeResolveSchema = z.object({
  outcome: z.enum(['client', 'provider', 'split'], { error: 'Décision invalide.' }),
  providerSharePercent: z.number().min(0).max(100).optional(),
  note: z.string().trim().optional(),
})

/** Note interne sur une mission. Iso le schéma local de `missions/[id]/note`. */
export const missionNoteSchema = z.object({
  body: requiredTrimmed('La note ne peut pas être vide.'),
})

/** Réassignation d'une mission à un autre prestataire. Iso le schéma local de `missions/[id]/reassign`. */
export const missionReassignSchema = z.object({
  providerId: requiredTrimmed('Le prestataire de remplacement est requis.'),
})
