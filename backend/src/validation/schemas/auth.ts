import { z } from 'zod'
import { requiredTrimmed } from '../primitives'

/**
 * Schémas zod des endpoints d'authentification (#356, audit M5). Portés iso
 * depuis `server/utils/apiValidationAuth.ts` (ADR-0016) : mêmes champs, mêmes
 * messages français, lus tels quels côté front.
 *
 * Ne valident que la FORME (présence, type, énumération) : la normalisation du
 * contact, la vérification du mot de passe actuel et la consommation du code
 * OTP restent des règles métier dans `authService`/`otpService`, pas dupliquées ici.
 */

const contactMethodSchema = z.enum(['phone', 'email'], { error: 'Méthode de contact invalide.' })

/** Corps de `POST /api/auth/otp/send` (#23, envoi d'un code de vérification). */
export const sendOtpSchema = z.object({
  method: contactMethodSchema,
  value: z.string().optional().default(''),
})

/** Corps de `POST /api/auth/otp/verify` (#23, vérification du code). */
export const verifyOtpSchema = z.object({
  method: contactMethodSchema,
  value: z.string().optional().default(''),
  code: z.string().optional().default(''),
})

/** Corps de `POST /api/auth/password` (#125/#126, création/changement de mot de passe). */
export const setPasswordSchema = z.object({
  currentPassword: z.string().optional().default(''),
  password: z.string().optional().default(''),
  confirmPassword: z.string().optional().default(''),
})

/** Corps de `PATCH /api/auth/profile` (modification du profil depuis « Mon espace »). */
export const updateProfileSchema = z.object({
  username: requiredTrimmed("Nom d'utilisateur, prénom, nom et localisation sont requis."),
  firstName: requiredTrimmed("Nom d'utilisateur, prénom, nom et localisation sont requis."),
  lastName: requiredTrimmed("Nom d'utilisateur, prénom, nom et localisation sont requis."),
  location: requiredTrimmed("Nom d'utilisateur, prénom, nom et localisation sont requis."),
})

/**
 * Corps de `POST /api/auth/session` (#125/#126, connexion/inscription). La
 * plupart des champs restent optionnels au niveau de la forme : leur caractère
 * obligatoire dépend du contexte (nouveau compte vs existant, compte finalisé
 * ou non) et reste tranché dans `authService`.
 */
export const createSessionSchema = z.object({
  method: contactMethodSchema,
  value: z.string().optional().default(''),
  role: z.enum(['client', 'prestataire']).optional(),
  password: z.string().optional(),
  rememberMe: z.boolean().optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  /** Code de parrainage saisi à l'inscription (#365) — optionnel, ignoré s'il est invalide. */
  referralCode: z.string().optional(),
})
