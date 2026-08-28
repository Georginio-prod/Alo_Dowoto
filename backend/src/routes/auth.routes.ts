import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { createSessionSchema, sendOtpSchema, setPasswordSchema, updateProfileSchema, verifyOtpSchema } from '../validation/schemas/auth'
import {
  createSessionHandler,
  deletePosition,
  deleteSession,
  getSession,
  googleCallback,
  googlePending,
  googleStart,
  sendOtp,
  setPasswordHandler,
  updateProfileHandler,
  verifyOtp,
} from '../controllers/authController'

/**
 * Authentification (#23/#125/#126/#219), portée depuis `server/api/auth/**`
 * (Phase 2, ADR-0017). Montée sous `/api` → chemins identiques à Nitro. Mêle
 * routes publiques (OTP, connexion, Google) et routes protégées (session
 * courante, mot de passe, profil, position) par `requireSessionUser`.
 */
export const authRoutes = Router()

/**
 * @openapi
 * /auth/session:
 *   get:
 *     tags: [Auth]
 *     summary: Compte connecté (session courante)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Utilisateur connecté. }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
authRoutes.get('/auth/session', requireSessionUser, asyncHandler(getSession))

/**
 * @openapi
 * /auth/session:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion ou inscription (crée une session)
 *     description: Exige un contact préalablement vérifié par OTP. Redemande le mot de passe d'un compte déjà finalisé (#126) et refuse un compte suspendu.
 *     responses:
 *       200: { description: Connexion d'un compte existant. }
 *       201: { description: Inscription (nouveau compte). }
 *       400: { description: Requête invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Contact non vérifié ou identifiants invalides., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Compte suspendu., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
authRoutes.post('/auth/session', validateBody(createSessionSchema), asyncHandler(createSessionHandler))

/**
 * @openapi
 * /auth/session:
 *   delete:
 *     tags: [Auth]
 *     summary: Déconnexion (détruit la session)
 *     responses:
 *       200: { description: Session détruite, cookie effacé. }
 */
authRoutes.delete('/auth/session', asyncHandler(deleteSession))

/**
 * @openapi
 * /auth/otp/send:
 *   post:
 *     tags: [Auth]
 *     summary: Envoi d'un code de vérification (SMS/email)
 *     responses:
 *       200: { description: Code envoyé (ou journalisé en dev). }
 *       400: { description: Contact invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Renvoi trop rapproché., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       502: { description: Échec du provider d'envoi., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
authRoutes.post('/auth/otp/send', validateBody(sendOtpSchema), asyncHandler(sendOtp))

/**
 * @openapi
 * /auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Vérification du code OTP
 *     responses:
 *       200: { description: Contact vérifié. }
 *       400: { description: Code invalide ou expiré., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Trop de tentatives., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
authRoutes.post('/auth/otp/verify', validateBody(verifyOtpSchema), asyncHandler(verifyOtp))

/**
 * @openapi
 * /auth/password:
 *   post:
 *     tags: [Auth]
 *     summary: Création (finalisation #125) ou changement (#126) du mot de passe
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Mot de passe défini. }
 *       400: { description: Mot de passe faible ou non concordant., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté ou mot de passe actuel incorrect., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
authRoutes.post('/auth/password', requireSessionUser, validateBody(setPasswordSchema), asyncHandler(setPasswordHandler))

/**
 * @openapi
 * /auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Modification du profil (« Mon espace »)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Profil mis à jour. }
 *       400: { description: Champs requis manquants., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
authRoutes.patch('/auth/profile', requireSessionUser, validateBody(updateProfileSchema), asyncHandler(updateProfileHandler))

/**
 * @openapi
 * /auth/position:
 *   delete:
 *     tags: [Auth]
 *     summary: Suppression de la position GPS enregistrée (#geoloc, vie privée)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Position effacée. }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
authRoutes.delete('/auth/position', requireSessionUser, asyncHandler(deletePosition))

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Démarre « Continuer avec Google » (redirection OAuth)
 *     responses:
 *       302: { description: Redirection vers l'écran de consentement Google (ou /auth en cas d'erreur de config). }
 */
authRoutes.get('/auth/google', googleStart)

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Retour du consentement Google (crée la session ou reprend l'inscription)
 *     responses:
 *       302: { description: Redirection vers l'app (session ouverte) ou /auth (inscription/erreur). }
 */
authRoutes.get('/auth/google/callback', asyncHandler(googleCallback))

/**
 * @openapi
 * /auth/google/pending:
 *   get:
 *     tags: [Auth]
 *     summary: Profil Google en attente d'inscription (préremplissage)
 *     responses:
 *       200: { description: Profil en attente, ou `null`. }
 */
authRoutes.get('/auth/google/pending', googlePending)
