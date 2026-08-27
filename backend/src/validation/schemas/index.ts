/**
 * Barrel des schémas de validation **par domaine**. Vide pour l'instant : les
 * schémas zod sont repris depuis `server/utils/apiValidation*.ts` **au fur et à
 * mesure** du portage des routes (Phase 2), un fichier par domaine
 * (`requests.ts`, `payments.ts`, `wallet.ts`, `conversations.ts`, `admin.ts`…),
 * réexporté ici. Chaque schéma compose les primitives partagées de
 * `../primitives` et se branche sur une route via `validateBody`/`parseSchema`
 * (`../validate`).
 *
 * Ce barrel donne un point d'import unique et stable aux routes et aux tests de
 * contrat, indépendamment de l'organisation interne des fichiers de domaine.
 */

export {}
