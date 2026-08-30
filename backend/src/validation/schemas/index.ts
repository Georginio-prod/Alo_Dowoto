/**
 * Barrel des schémas de validation **par domaine**. Les schémas zod sont repris
 * depuis `server/utils/apiValidation*.ts` **au fur et à mesure** du portage des
 * routes (Phase 2), un fichier par domaine (`testimonials.ts`, `requests.ts`,
 * `payments.ts`, `wallet.ts`, `conversations.ts`, `admin.ts`…), réexporté ici.
 * Chaque schéma compose les primitives partagées de `../primitives` et se
 * branche sur une route via `validateBody`/`parseSchema` (`../validate`).
 *
 * Ce barrel donne un point d'import unique et stable aux routes et aux tests de
 * contrat, indépendamment de l'organisation interne des fichiers de domaine.
 */

export * from './auth'
export * from './assistant'
export * from './requests'
export * from './testimonials'
export * from './reclamations'
export * from './favorites'
export * from './subscriptions'
export * from './providers'
export * from './conversations'
export * from './admin'
