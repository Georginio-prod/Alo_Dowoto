import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireAdminRole, requireAdminPermission } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import {
  promoteAdminSchema,
  kycApproveSchema,
  reasonBodySchema,
  riskFlagSchema,
  retryTransactionSchema,
  subscriptionExtendSchema,
  manualRefundSchema,
  teamLevelSchema,
  toggleActiveSchema,
  planCreateSchema,
  planPatchSchema,
  couponCreateSchema,
  settingsPatchSchema,
  sectorCreateSchema,
  sectorPatchSchema,
  prealableQuestionSchema,
  siteContentSchema,
  adminMessageSchema,
  disputeResolveSchema,
  missionNoteSchema,
  missionReassignSchema,
  antiCircumventionRestrictSchema,
  antiCircumventionFalsePositiveSchema,
  campaignSchema,
} from '../validation/schemas/admin'
import {
  adminLogin,
  adminLogout,
  adminSession,
  createAdmin,
  listAdmins,
  listTeam,
  promoteTeamMember,
} from '../controllers/adminAuthController'
import {
  adminAlerts,
  adminBadges,
  adminCatalog,
  adminOverview,
  adminSearch,
} from '../controllers/adminDashboardController'
import { adminWallet } from '../controllers/adminWalletController'
import { adminConversationDetail, adminUserDetail } from '../controllers/adminDetailController'
import {
  adminKycApprove,
  adminKycReject,
  adminProviderSubscriptionCancel,
  adminProviderSubscriptionExtend,
  adminProviderVerify,
} from '../controllers/adminProviderActionsController'
import { adminArbitrate, adminEscrowRefund } from '../controllers/adminEscrowActionsController'
import {
  adminAnnounce,
  adminComplaintUpdate,
  adminTestimonialDelete,
  adminTestimonialSetHidden,
} from '../controllers/adminModerationController'
import {
  adminCreateCoupon,
  adminCreatePlan,
  adminGetSettings,
  adminListCoupons,
  adminListPlans,
  adminToggleCoupon,
  adminTogglePlan,
  adminUpdatePlan,
  adminUpdateSettings,
} from '../controllers/adminPlanController'
import {
  adminCreateCategory,
  adminCreateQuestion,
  adminDeleteQuestion,
  adminListCategories,
  adminListContent,
  adminListQuestions,
  adminUpdateCategory,
  adminUpsertContent,
} from '../controllers/adminCategoryController'
import {
  adminListDisputes,
  adminRequestEvidence,
  adminResolveDispute,
} from '../controllers/adminDisputeController'
import {
  adminContactReviewAuthor,
  adminDeleteReview,
  adminHideReview,
  adminListReviews,
  adminRestoreReview,
} from '../controllers/adminReviewController'
import {
  adminListMissions,
  adminMissionCancel,
  adminMissionDetail,
  adminMissionForceValidate,
  adminMissionNote,
  adminMissionNudge,
  adminMissionReassign,
} from '../controllers/adminMissionController'
import {
  adminDeleteUser,
  adminManageSubscription,
  adminReactivateUser,
  adminResetPassword,
  adminSetRiskFlag,
  adminSuspendUser,
  adminTeamSetLevel,
} from '../controllers/adminUserActionsController'
import {
  adminClientRefund,
  adminPaymentFail,
  adminPaymentRefund,
  adminPaymentRelease,
  adminPaymentRetry,
} from '../controllers/adminPaymentActionsController'
import {
  adminComplaints,
  adminProviders,
  adminTestimonials,
  adminUsers,
} from '../controllers/adminListController'
import {
  adminEscrow,
  adminPayments,
  adminSubscriptions,
} from '../controllers/adminFinanceController'
import {
  adminAntiCircumventionDashboard,
  adminAntiCircumventionFalsePositive,
  adminAntiCircumventionRestrictMessaging,
  adminAntiCircumventionWarn,
} from '../controllers/adminAntiCircumventionController'
import { adminAuditLog } from '../controllers/adminAuditLogController'
import { adminCreateCampaign, adminListCampaigns } from '../controllers/adminCampaignController'

/**
 * Dashboard admin desktop (#admin) — sous-lot 1 : authentification, session,
 * gestion des comptes admin et de l'équipe. Porté depuis `server/api/admin/**`
 * (ADR-0017). Monté sous `/api` → chemins iso Nitro (`/api/admin/...`). Le
 * dashboard Electron porte le jeton en `Authorization: Bearer`.
 *
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Dashboard d'administration (auth Bearer, rôle admin).
 */
export const adminRoutes = Router()

/**
 * @openapi
 * /admin/login:
 *   post:
 *     tags: [Admin]
 *     summary: Connexion admin (email + mot de passe) → jeton Bearer
 *     responses:
 *       200: { description: Jeton de session et profil admin. }
 *       401: { description: Identifiants invalides., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Trop de tentatives., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/login', asyncHandler(adminLogin))

/**
 * @openapi
 * /admin/logout:
 *   post:
 *     tags: [Admin]
 *     summary: Déconnexion admin (invalide le jeton courant)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Session invalidée. }
 */
adminRoutes.post('/admin/logout', requireAdminRole, asyncHandler(adminLogout))

/**
 * @openapi
 * /admin/session:
 *   get:
 *     tags: [Admin]
 *     summary: Vérifie le jeton admin au démarrage du dashboard
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Admin courant + permissions. }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux administrateurs., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.get('/admin/session', requireAdminRole, asyncHandler(adminSession))

/**
 * @openapi
 * /admin/admins:
 *   get:
 *     tags: [Admin]
 *     summary: Liste des comptes admin + catalogue des permissions (admins.manage)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Comptes admin et permissions disponibles. }
 *   post:
 *     tags: [Admin]
 *     summary: Crée un compte admin restreint (admins.manage)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Compte admin créé. }
 *       400: { description: Corps invalide ou email déjà pris., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.get('/admin/admins', requireAdminPermission('admins.manage'), asyncHandler(listAdmins))
adminRoutes.post('/admin/admins', requireAdminPermission('admins.manage'), asyncHandler(createAdmin))

/**
 * @openapi
 * /admin/team:
 *   get:
 *     tags: [Admin]
 *     summary: Équipe admin avec niveaux d'accès (module 12)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Comptes ayant le rôle admin. }
 */
adminRoutes.get('/admin/team', requireAdminRole, asyncHandler(listTeam))

/**
 * @openapi
 * /admin/team/promote:
 *   post:
 *     tags: [Admin]
 *     summary: Promeut un compte existant au rôle admin (tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Compte promu. }
 *       400: { description: Corps invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/team/promote', requireAdminRole, validateBody(promoteAdminSchema), asyncHandler(promoteTeamMember))

/**
 * @openapi
 * /admin/team/{id}/level:
 *   post:
 *     tags: [Admin]
 *     summary: Change le niveau d'accès d'un membre de l'équipe (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Niveau mis à jour. }
 *       400: { description: Niveau invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/team/:id/level', requireAdminRole, validateBody(teamLevelSchema), asyncHandler(adminTeamSetLevel))

/**
 * Sous-lot 2 — dashboards en LECTURE SEULE. Portés depuis
 * `server/api/admin/**.get.ts` (ADR-0017). Gating par permission granulaire,
 * sauf `badges`/`search` réservés au rôle admin (iso Nitro `requireAdminRole`).
 */

/**
 * @openapi
 * /admin/overview:
 *   get:
 *     tags: [Admin]
 *     summary: Vue d'ensemble — agrégats desktop + KPIs/entonnoir/activité (dashboard.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Superset des indicateurs du dashboard. }
 */
adminRoutes.get('/admin/overview', requireAdminPermission('dashboard.view'), asyncHandler(adminOverview))

/**
 * @openapi
 * /admin/badges:
 *   get:
 *     tags: [Admin]
 *     summary: Compteurs « à traiter » de la barre latérale (rôle admin)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Prestataires non vérifiés, litiges, réclamations 7j, abonnements en attente. }
 */
adminRoutes.get('/admin/badges', requireAdminRole, asyncHandler(adminBadges))

/**
 * @openapi
 * /admin/alerts:
 *   get:
 *     tags: [Admin]
 *     summary: Compteurs de la cloche de l'en-tête — litiges/KYC/paiements bloqués (rôle admin)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Litiges ouverts, KYC en attente, paiements bloqués, total. }
 */
adminRoutes.get('/admin/alerts', requireAdminRole, asyncHandler(adminAlerts))

/**
 * @openapi
 * /admin/wallet:
 *   get:
 *     tags: [Admin]
 *     summary: Portefeuille plateforme, en lecture seule (wallet.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Solde plateforme, mouvements récents, recharges Mobile Money. }
 */
adminRoutes.get('/admin/wallet', requireAdminPermission('wallet.view'), asyncHandler(adminWallet))

/**
 * @openapi
 * /admin/catalog:
 *   get:
 *     tags: [Admin]
 *     summary: Catalogue des secteurs et sous-secteurs, en lecture seule (catalog.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Secteurs avec nombre de prestataires. }
 */
adminRoutes.get('/admin/catalog', requireAdminPermission('catalog.view'), asyncHandler(adminCatalog))

/**
 * @openapi
 * /admin/search:
 *   get:
 *     tags: [Admin]
 *     summary: Recherche globale de l'en-tête admin (rôle admin)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Comptes correspondant à la requête (min. 2 caractères). }
 */
adminRoutes.get('/admin/search', requireAdminRole, asyncHandler(adminSearch))

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Liste paginée des comptes, filtres rôle/abonné (users.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Comptes paginés (le hash de mot de passe n'est jamais exposé). }
 */
adminRoutes.get('/admin/users', requireAdminPermission('users.view'), asyncHandler(adminUsers))

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Fiche détaillée d'un compte — profil, abonnements, paiements, stats (users.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Fiche compte détaillée (jamais de hash de mot de passe). }
 *       404: { description: Utilisateur introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.get('/admin/users/:id', requireAdminPermission('users.view'), asyncHandler(adminUserDetail))

/**
 * @openapi
 * /admin/conversations/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Détail d'une mise en relation + fil de messages (conversations.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Client, prestataire résolu et messages échangés. }
 *       404: { description: Conversation introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.get('/admin/conversations/:id', requireAdminPermission('conversations.view'), asyncHandler(adminConversationDetail))

/**
 * Sous-lot 3 — actions MUTANTES sur les comptes. Portées depuis
 * `server/api/admin/users/[id]/**` et `users/[id].delete`.
 *
 * @openapi
 * /admin/users/{id}/suspend:
 *   post:
 *     tags: [Admin]
 *     summary: Suspend ou réactive un compte (users.suspend, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Compte suspendu/réactivé. }
 *       400: { description: Garde-fou (compte propre)., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/users/:id/suspend', requireAdminPermission('users.suspend'), asyncHandler(adminSuspendUser))

/**
 * @openapi
 * /admin/users/{id}/reactivate:
 *   post:
 *     tags: [Admin]
 *     summary: Réactive un compte suspendu (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Compte réactivé. }
 */
adminRoutes.post('/admin/users/:id/reactivate', requireAdminRole, asyncHandler(adminReactivateUser))

/**
 * @openapi
 * /admin/users/{id}/password:
 *   post:
 *     tags: [Admin]
 *     summary: Réinitialise le mot de passe d'un compte, coupe les sessions (users.password)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Mot de passe réinitialisé. }
 *       400: { description: Mot de passe trop court ou compte admin., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/users/:id/password', requireAdminPermission('users.password'), asyncHandler(adminResetPassword))

/**
 * @openapi
 * /admin/users/{id}/risk-flag:
 *   post:
 *     tags: [Admin]
 *     summary: Marque ou retire un compte « à risque » (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Compte marqué/démarqué. }
 *       400: { description: Valeur invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/users/:id/risk-flag', requireAdminRole, validateBody(riskFlagSchema), asyncHandler(adminSetRiskFlag))

/**
 * @openapi
 * /admin/users/{id}/subscription:
 *   post:
 *     tags: [Admin]
 *     summary: Gestion manuelle d'abonnement prestataire — grant/extend/cancel (subscriptions.manage)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Abonnement mis à jour. }
 *       400: { description: Action ou formule invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/users/:id/subscription', requireAdminPermission('subscriptions.manage'), asyncHandler(adminManageSubscription))

/**
 * @openapi
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Suppression définitive et transactionnelle d'un compte (users.delete)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Compte supprimé. }
 *       400: { description: Garde-fou (compte propre / dernier admin)., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.delete('/admin/users/:id', requireAdminPermission('users.delete'), asyncHandler(adminDeleteUser))

/**
 * @openapi
 * /admin/providers:
 *   get:
 *     tags: [Admin]
 *     summary: Liste paginée des profils prestataires, filtre vérifié (providers.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Profils prestataires paginés. }
 */
adminRoutes.get('/admin/providers', requireAdminPermission('providers.view'), asyncHandler(adminProviders))

/**
 * Sous-lot 3 — actions MUTANTES. KYC (validation/refus, tracé) et bascule du
 * badge « Vérifié ». Portées depuis `server/api/admin/providers/[id]/**`.
 *
 * @openapi
 * /admin/providers/{id}/kyc-approve:
 *   post:
 *     tags: [Admin]
 *     summary: Valide la vérification d'identité d'un prestataire (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Décision KYC enregistrée. }
 */
adminRoutes.post('/admin/providers/:id/kyc-approve', requireAdminRole, validateBody(kycApproveSchema), asyncHandler(adminKycApprove))

/**
 * @openapi
 * /admin/providers/{id}/kyc-reject:
 *   post:
 *     tags: [Admin]
 *     summary: Refuse la vérification (motif requis) et révoque le badge (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Décision KYC enregistrée, badge révoqué. }
 *       400: { description: Motif manquant., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/providers/:id/kyc-reject', requireAdminRole, validateBody(reasonBodySchema), asyncHandler(adminKycReject))

/**
 * @openapi
 * /admin/providers/{id}/verify:
 *   post:
 *     tags: [Admin]
 *     summary: Bascule le badge « Vérifié » d'un profil prestataire (providers.verify)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Profil mis à jour. }
 *       404: { description: Profil prestataire introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/providers/:id/verify', requireAdminPermission('providers.verify'), asyncHandler(adminProviderVerify))

/**
 * @openapi
 * /admin/providers/{id}/subscription-cancel:
 *   post:
 *     tags: [Admin]
 *     summary: Annule l'abonnement d'un prestataire (rôle admin, tracé). id = userId
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Abonnement annulé. }
 *       404: { description: Aucun abonnement., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/providers/:id/subscription-cancel', requireAdminRole, asyncHandler(adminProviderSubscriptionCancel))

/**
 * @openapi
 * /admin/providers/{id}/subscription-extend:
 *   post:
 *     tags: [Admin]
 *     summary: Prolonge l'abonnement d'un prestataire (rôle admin, tracé). id = userId
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Abonnement prolongé. }
 *       400: { description: Durée invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Aucun abonnement., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/providers/:id/subscription-extend', requireAdminRole, validateBody(subscriptionExtendSchema), asyncHandler(adminProviderSubscriptionExtend))

/**
 * @openapi
 * /admin/payments:
 *   get:
 *     tags: [Admin]
 *     summary: Liste paginée des paiements Mobile Money, filtre statut (payments.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Paiements paginés + somme des montants filtrés. }
 */
adminRoutes.get('/admin/payments', requireAdminPermission('payments.view'), asyncHandler(adminPayments))

/**
 * Sous-lot 3 — actions MUTANTES paiements & séquestre. Portées depuis
 * `server/api/admin/payments/[id]/**`.
 *
 * @openapi
 * /admin/payments/{id}/fail:
 *   post:
 *     tags: [Admin]
 *     summary: Marque un paiement en attente comme échoué (payments.manage)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Paiement marqué échoué. }
 *       400: { description: Paiement non en attente., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/payments/:id/fail', requireAdminPermission('payments.manage'), asyncHandler(adminPaymentFail))

/**
 * @openapi
 * /admin/payments/{id}/refund:
 *   post:
 *     tags: [Admin]
 *     summary: Remboursement total d'une commande en séquestre (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Commande remboursée. }
 *       400: { description: Statut incompatible ou motif manquant., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/payments/:id/refund', requireAdminRole, validateBody(reasonBodySchema), asyncHandler(adminPaymentRefund))

/**
 * @openapi
 * /admin/payments/{id}/release:
 *   post:
 *     tags: [Admin]
 *     summary: Libère manuellement les fonds séquestrés d'une commande (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Fonds libérés. }
 *       400: { description: Commande introuvable ou statut incompatible., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/payments/:id/release', requireAdminRole, asyncHandler(adminPaymentRelease))

/**
 * @openapi
 * /admin/payments/{id}/retry:
 *   post:
 *     tags: [Admin]
 *     summary: Rejoue une transaction échouée — abonnement ou recharge (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Transaction rejouée. }
 *       400: { description: Type invalide, transaction introuvable ou non échouée., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/payments/:id/retry', requireAdminRole, validateBody(retryTransactionSchema), asyncHandler(adminPaymentRetry))

/**
 * @openapi
 * /admin/clients/{id}/refund:
 *   post:
 *     tags: [Admin]
 *     summary: Remboursement manuel d'un chercheur, crédit direct du portefeuille (rôle admin, tracé)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Chercheur remboursé. }
 *       400: { description: Montant ou motif manquant., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/clients/:id/refund', requireAdminRole, validateBody(manualRefundSchema), asyncHandler(adminClientRefund))

/**
 * @openapi
 * /admin/escrow:
 *   get:
 *     tags: [Admin]
 *     summary: Liste paginée des commandes en séquestre, filtre statut (escrow.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Commandes de séquestre paginées + somme des montants filtrés. }
 */
adminRoutes.get('/admin/escrow', requireAdminPermission('escrow.view'), asyncHandler(adminEscrow))

/**
 * @openapi
 * /admin/escrow/{conversationId}/arbitrate:
 *   post:
 *     tags: [Admin]
 *     summary: Tranche un litige — verse au prestataire ou rembourse le chercheur (escrow.manage)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: conversationId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Litige arbitré, commande mise à jour. }
 *       400: { description: Verdict invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Commande introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: Commande non arbitrable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/escrow/:conversationId/arbitrate', requireAdminPermission('escrow.manage'), asyncHandler(adminArbitrate))

/**
 * @openapi
 * /admin/escrow/{conversationId}/refund:
 *   post:
 *     tags: [Admin]
 *     summary: Rembourse une commande sous séquestre au chercheur, sans pénalité (escrow.manage)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: conversationId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Commande remboursée. }
 *       404: { description: Commande introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: Commande non remboursable ici., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/escrow/:conversationId/refund', requireAdminPermission('escrow.manage'), asyncHandler(adminEscrowRefund))

/**
 * @openapi
 * /admin/subscriptions:
 *   get:
 *     tags: [Admin]
 *     summary: Liste paginée des abonnements prestataires, filtre statut (subscriptions.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Abonnements paginés. }
 */
adminRoutes.get('/admin/subscriptions', requireAdminPermission('subscriptions.view'), asyncHandler(adminSubscriptions))

/**
 * @openapi
 * /admin/testimonials:
 *   get:
 *     tags: [Admin]
 *     summary: Liste paginée des témoignages réels à modérer, filtre masqué (testimonials.moderate)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Témoignages paginés. }
 */
adminRoutes.get('/admin/testimonials', requireAdminPermission('testimonials.moderate'), asyncHandler(adminTestimonials))

/**
 * Sous-lot 3 — modération & support (mutations).
 *
 * @openapi
 * /admin/testimonials/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Masque ou réaffiche un témoignage (testimonials.moderate)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Témoignage masqué/réaffiché. }
 *       404: { description: Témoignage introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     tags: [Admin]
 *     summary: Supprime définitivement un témoignage réel (testimonials.moderate)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Témoignage supprimé. }
 *       404: { description: Témoignage introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.patch('/admin/testimonials/:id', requireAdminPermission('testimonials.moderate'), asyncHandler(adminTestimonialSetHidden))
adminRoutes.delete('/admin/testimonials/:id', requireAdminPermission('testimonials.moderate'), asyncHandler(adminTestimonialDelete))

/**
 * @openapi
 * /admin/complaints/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Traite une réclamation — statut + note interne (complaints.manage)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Réclamation mise à jour. }
 *       400: { description: Statut invalide ou aucune modification., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Réclamation introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.patch('/admin/complaints/:id', requireAdminPermission('complaints.manage'), asyncHandler(adminComplaintUpdate))

/**
 * @openapi
 * /admin/announcements:
 *   post:
 *     tags: [Admin]
 *     summary: Diffuse une annonce in-app (all/clients/prestataires/user) (notifications.send)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Annonce envoyée (nombre de destinataires). }
 *       400: { description: Titre/message ou cible invalides., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
adminRoutes.post('/admin/announcements', requireAdminPermission('notifications.send'), asyncHandler(adminAnnounce))

/**
 * @openapi
 * /admin/complaints:
 *   get:
 *     tags: [Admin]
 *     summary: Liste paginée des réclamations, filtres catégorie/statut (complaints.view)
 *     security: [{ bearerAuth: [] }, { cookieAuth: [] }]
 *     responses:
 *       200: { description: Réclamations paginées. }
 */
adminRoutes.get('/admin/complaints', requireAdminPermission('complaints.view'), asyncHandler(adminComplaints))

/**
 * Sous-lot 3 — catalogue tarifaire & éditorial (rôle admin, tracé). Portés depuis
 * `server/api/admin/{plans,coupons,settings,categories,questions,content}/**`.
 *
 * @openapi
 * /admin/plans:
 *   get: { tags: [Admin], summary: Formules d'abonnement configurées (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Liste des formules. } } }
 *   post: { tags: [Admin], summary: Crée une formule (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Formule créée. } } }
 */
adminRoutes.get('/admin/plans', requireAdminRole, asyncHandler(adminListPlans))
adminRoutes.post('/admin/plans', requireAdminRole, validateBody(planCreateSchema), asyncHandler(adminCreatePlan))

/**
 * @openapi
 * /admin/plans/{id}:
 *   patch: { tags: [Admin], summary: Modifie une formule (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Formule modifiée. } } }
 */
adminRoutes.patch('/admin/plans/:id', requireAdminRole, validateBody(planPatchSchema), asyncHandler(adminUpdatePlan))

/**
 * @openapi
 * /admin/plans/{id}/toggle:
 *   post: { tags: [Admin], summary: Active/désactive une formule (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Formule (dés)activée. } } }
 */
adminRoutes.post('/admin/plans/:id/toggle', requireAdminRole, validateBody(toggleActiveSchema), asyncHandler(adminTogglePlan))

/**
 * @openapi
 * /admin/coupons:
 *   get: { tags: [Admin], summary: Codes promo (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Liste des coupons. } } }
 *   post: { tags: [Admin], summary: Crée un code promo (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Coupon créé. } } }
 */
adminRoutes.get('/admin/coupons', requireAdminRole, asyncHandler(adminListCoupons))
adminRoutes.post('/admin/coupons', requireAdminRole, validateBody(couponCreateSchema), asyncHandler(adminCreateCoupon))

/**
 * @openapi
 * /admin/coupons/{id}/toggle:
 *   post: { tags: [Admin], summary: Active/désactive un code promo (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Coupon (dés)activé. } } }
 */
adminRoutes.post('/admin/coupons/:id/toggle', requireAdminRole, validateBody(toggleActiveSchema), asyncHandler(adminToggleCoupon))

/**
 * @openapi
 * /admin/settings:
 *   get: { tags: [Admin], summary: Réglages généraux de la plateforme (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Réglages. } } }
 *   patch: { tags: [Admin], summary: Met à jour les réglages généraux (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Réglages mis à jour. } } }
 */
adminRoutes.get('/admin/settings', requireAdminRole, asyncHandler(adminGetSettings))
adminRoutes.patch('/admin/settings', requireAdminRole, validateBody(settingsPatchSchema), asyncHandler(adminUpdateSettings))

/**
 * @openapi
 * /admin/categories:
 *   get: { tags: [Admin], summary: Catégories de service avec sous-secteurs (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Catégories. } } }
 *   post: { tags: [Admin], summary: Crée une catégorie (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Catégorie créée. } } }
 */
adminRoutes.get('/admin/categories', requireAdminRole, asyncHandler(adminListCategories))
adminRoutes.post('/admin/categories', requireAdminRole, validateBody(sectorCreateSchema), asyncHandler(adminCreateCategory))

/**
 * @openapi
 * /admin/categories/{id}:
 *   patch: { tags: [Admin], summary: Renomme/réordonne/(dés)active/change l'icône d'une catégorie (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Catégorie mise à jour. } } }
 */
adminRoutes.patch('/admin/categories/:id', requireAdminRole, validateBody(sectorPatchSchema), asyncHandler(adminUpdateCategory))

/**
 * @openapi
 * /admin/categories/{id}/questions:
 *   get: { tags: [Admin], summary: Questions de fiche préalable d'une catégorie (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Questions. } } }
 *   post: { tags: [Admin], summary: Ajoute une question de fiche préalable (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Question créée. } } }
 */
adminRoutes.get('/admin/categories/:id/questions', requireAdminRole, asyncHandler(adminListQuestions))
adminRoutes.post('/admin/categories/:id/questions', requireAdminRole, validateBody(prealableQuestionSchema), asyncHandler(adminCreateQuestion))

/**
 * @openapi
 * /admin/questions/{id}:
 *   delete: { tags: [Admin], summary: Supprime une question de fiche préalable (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Question supprimée. } } }
 */
adminRoutes.delete('/admin/questions/:id', requireAdminRole, asyncHandler(adminDeleteQuestion))

/**
 * @openapi
 * /admin/content:
 *   get: { tags: [Admin], summary: Blocs de contenu éditables (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Contenu. } } }
 *   post: { tags: [Admin], summary: Crée ou met à jour un bloc de contenu (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Contenu enregistré. } } }
 */
adminRoutes.get('/admin/content', requireAdminRole, asyncHandler(adminListContent))
adminRoutes.post('/admin/content', requireAdminRole, validateBody(siteContentSchema), asyncHandler(adminUpsertContent))

/**
 * Sous-lot 3 — litiges, avis, missions (dashboard web, modules 4/6/8). Rôle
 * admin, actions tracées. Portés depuis `server/api/admin/{disputes,reviews,missions}/**`.
 *
 * @openapi
 * /admin/disputes:
 *   get: { tags: [Admin], summary: File des litiges ouverts (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Litiges ouverts. } } }
 */
adminRoutes.get('/admin/disputes', requireAdminRole, asyncHandler(adminListDisputes))

/**
 * @openapi
 * /admin/disputes/{id}/resolve:
 *   post: { tags: [Admin], summary: Tranche un litige — client/provider/split (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Litige tranché. }, 400: { description: Décision invalide ou litige clos., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/disputes/:id/resolve', requireAdminRole, validateBody(disputeResolveSchema), asyncHandler(adminResolveDispute))

/**
 * @openapi
 * /admin/disputes/{id}/request-evidence:
 *   post: { tags: [Admin], summary: Demande des preuves complémentaires aux deux parties (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Demande envoyée. }, 404: { description: Litige introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/disputes/:id/request-evidence', requireAdminRole, asyncHandler(adminRequestEvidence))

/**
 * @openapi
 * /admin/reviews:
 *   get: { tags: [Admin], summary: Avis, signalés en tête (?flagged=1) (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Avis avec état de modération. } } }
 */
adminRoutes.get('/admin/reviews', requireAdminRole, asyncHandler(adminListReviews))

/**
 * @openapi
 * /admin/reviews/{id}/hide:
 *   post: { tags: [Admin], summary: Masque un avis, motif requis (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Avis masqué. }, 400: { description: Motif manquant., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/reviews/:id/hide', requireAdminRole, validateBody(reasonBodySchema), asyncHandler(adminHideReview))

/**
 * @openapi
 * /admin/reviews/{id}/restore:
 *   post: { tags: [Admin], summary: Restaure un avis masqué (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Avis restauré. } } }
 */
adminRoutes.post('/admin/reviews/:id/restore', requireAdminRole, asyncHandler(adminRestoreReview))

/**
 * @openapi
 * /admin/reviews/{id}/delete:
 *   post: { tags: [Admin], summary: Supprime un avis, motif requis (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Avis supprimé. }, 400: { description: Motif manquant., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/reviews/:id/delete', requireAdminRole, validateBody(reasonBodySchema), asyncHandler(adminDeleteReview))

/**
 * @openapi
 * /admin/reviews/{id}/contact-author:
 *   post: { tags: [Admin], summary: Contacte l'auteur d'un avis (message in-app) (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Message envoyé. }, 404: { description: Avis introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/reviews/:id/contact-author', requireAdminRole, validateBody(adminMessageSchema), asyncHandler(adminContactReviewAuthor))

/**
 * @openapi
 * /admin/missions:
 *   get: { tags: [Admin], summary: Missions paginées + brouillons (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Missions et brouillons. } } }
 */
adminRoutes.get('/admin/missions', requireAdminRole, asyncHandler(adminListMissions))

/**
 * @openapi
 * /admin/missions/{id}:
 *   get: { tags: [Admin], summary: Fiche détaillée d'une mission (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Détail mission. }, 404: { description: Mission introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.get('/admin/missions/:id', requireAdminRole, asyncHandler(adminMissionDetail))

/**
 * @openapi
 * /admin/missions/{id}/cancel:
 *   post: { tags: [Admin], summary: Annule une mission (remboursement intégral), motif requis (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Mission annulée. }, 400: { description: Introuvable ou statut incompatible., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/missions/:id/cancel', requireAdminRole, validateBody(reasonBodySchema), asyncHandler(adminMissionCancel))

/**
 * @openapi
 * /admin/missions/{id}/force-validate:
 *   post: { tags: [Admin], summary: Force la libération des fonds d'une mission (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Fonds libérés. }, 400: { description: Introuvable ou statut incompatible., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/missions/:id/force-validate', requireAdminRole, asyncHandler(adminMissionForceValidate))

/**
 * @openapi
 * /admin/missions/{id}/note:
 *   post: { tags: [Admin], summary: Ajoute une note interne à une mission (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Note ajoutée. }, 400: { description: Note vide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/missions/:id/note', requireAdminRole, validateBody(missionNoteSchema), asyncHandler(adminMissionNote))

/**
 * @openapi
 * /admin/missions/{id}/nudge:
 *   post: { tags: [Admin], summary: Relance les deux parties d'une mission (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Relance envoyée. }, 404: { description: Mission introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/missions/:id/nudge', requireAdminRole, asyncHandler(adminMissionNudge))

/**
 * @openapi
 * /admin/missions/{id}/reassign:
 *   post: { tags: [Admin], summary: Réassigne une mission à un autre prestataire (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Mission réassignée. }, 400: { description: Introuvable ou statut incompatible., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/missions/:id/reassign', requireAdminRole, validateBody(missionReassignSchema), asyncHandler(adminMissionReassign))

/**
 * Module 9 — anti-désintermédiation (rôle admin, actions tracées). Portées depuis
 * `server/api/admin/anti-circumvention/**`.
 *
 * @openapi
 * /admin/anti-circumvention:
 *   get: { tags: [Admin], summary: Tableau de bord des signaux anti-désintermédiation (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Signaux de contournement, chutes de missions, scores de risque, signal démo. } } }
 */
adminRoutes.get('/admin/anti-circumvention', requireAdminRole, asyncHandler(adminAntiCircumventionDashboard))

/**
 * @openapi
 * /admin/anti-circumvention/{userId}/warn:
 *   post: { tags: [Admin], summary: Envoie un avertissement anti-désintermédiation (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: userId, required: true, schema: { type: string } }], responses: { 200: { description: Avertissement envoyé. } } }
 */
adminRoutes.post('/admin/anti-circumvention/:userId/warn', requireAdminRole, asyncHandler(adminAntiCircumventionWarn))

/**
 * @openapi
 * /admin/anti-circumvention/{userId}/restrict-messaging:
 *   post: { tags: [Admin], summary: Restreint ou lève la restriction de messagerie d'un compte (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: userId, required: true, schema: { type: string } }], responses: { 200: { description: Compte mis à jour. }, 400: { description: Valeur invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.post('/admin/anti-circumvention/:userId/restrict-messaging', requireAdminRole, validateBody(antiCircumventionRestrictSchema), asyncHandler(adminAntiCircumventionRestrictMessaging))

/**
 * @openapi
 * /admin/anti-circumvention/{userId}/false-positive:
 *   post: { tags: [Admin], summary: Marque les signaux d'un compte comme faux positif — exclu du score de risque (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: path, name: userId, required: true, schema: { type: string } }], responses: { 200: { description: Faux positif enregistré. } } }
 */
adminRoutes.post('/admin/anti-circumvention/:userId/false-positive', requireAdminRole, validateBody(antiCircumventionFalsePositiveSchema), asyncHandler(adminAntiCircumventionFalsePositive))

/**
 * Module 12 — journal d'audit (rôle admin, lecture seule). Porté depuis
 * `server/api/admin/audit-log/index.get.ts`.
 *
 * @openapi
 * /admin/audit-log:
 *   get: { tags: [Admin], summary: Journal d'audit horodaté des actions sensibles, paginé et filtrable (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Entrées d'audit paginées (targetType, q). } } }
 */
adminRoutes.get('/admin/audit-log', requireAdminRole, asyncHandler(adminAuditLog))

/**
 * Module 11 — campagnes de notification (rôle admin, création tracée). Portées
 * depuis `server/api/admin/campaigns/**`.
 *
 * @openapi
 * /admin/campaigns:
 *   get: { tags: [Admin], summary: Historique des campagnes de notification (rôle admin), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Campagnes, les plus récentes d'abord. } } }
 *   post: { tags: [Admin], summary: Crée une campagne — envoi immédiat ou programmé, segment ciblé (rôle admin, tracé), security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: Campagne créée. }, 400: { description: Corps invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } } } }
 */
adminRoutes.get('/admin/campaigns', requireAdminRole, asyncHandler(adminListCampaigns))
adminRoutes.post('/admin/campaigns', requireAdminRole, validateBody(campaignSchema), asyncHandler(adminCreateCampaign))
