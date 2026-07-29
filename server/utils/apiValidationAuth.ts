import { z } from 'zod'
import { requiredTrimmed } from '~~/server/utils/apiValidation'

/**
 * Schémas zod pour les endpoints d'authentification (#356, audit M5). Voir
 * server/utils/apiValidation.ts pour le contexte général de `readSchemaBody`.
 *
 * Ne valident que la forme (présence, type, énumération) : la normalisation
 * du contact (`normalizeContact`), la vérification du mot de passe actuel et
 * la consommation du code OTP restent des règles métier dans les handlers,
 * pas dupliquées ici.
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
 * plupart des champs restent optionnels au niveau de la forme : leur
 * caractère obligatoire dépend du contexte (nouveau compte vs existant,
 * compte finalisé ou non) et reste tranché dans le handler.
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
