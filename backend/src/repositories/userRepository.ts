import type { PrismaClient, User } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données transverses aux comptes (`prisma.user`), réutilisé par plusieurs
 * domaines (parrainage, etc.). Client Prisma injecté (patron Phase 1). Ne porte
 * aucune logique métier ni erreur framework.
 */
/** Champs de profil collectés à l'inscription (iso `NewUserProfile`, userStore). */
export interface NewUserProfile {
  username: string
  firstName: string
  lastName: string
  location: string
  latitude?: number
  longitude?: number
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  /** Recherche par contact normalisé (connexion OTP/mot de passe, Google #219). */
  findByContact(contact: string): Promise<User | null>
  /** Recherche par identifiant Google (`sub` OpenID Connect, #219). */
  findByGoogleId(googleId: string): Promise<User | null>
  /** Recherche par code de parrainage (contrôle d'unicité, #365). */
  findByReferralCode(code: string): Promise<User | null>
  /** Crée un compte à l'inscription (rôle et profil définitifs, #19). */
  create(contact: string, role: 'client' | 'prestataire', profile: NewUserProfile): Promise<User>
  /** Met à jour le profil (nom d'utilisateur, prénom, nom, localisation). */
  updateProfile(id: string, profile: Pick<NewUserProfile, 'username' | 'firstName' | 'lastName' | 'location'>): Promise<User>
  /** Efface les coordonnées GPS enregistrées (#geoloc, vie privée) — pas la ville texte. */
  clearPosition(id: string): Promise<User>
  /** Lie un compte Google à un compte existant (#219, premier login Google). */
  linkGoogleId(id: string, googleId: string): Promise<void>
  /** Enregistre le hash de mot de passe (finalisation #125, changement #126). */
  setPasswordHash(id: string, passwordHash: string): Promise<void>
  /** Fixe le code de parrainage d'un compte. */
  setReferralCode(id: string, referralCode: string): Promise<void>
  /**
   * Anonymise les données personnelles d'un compte (droit à l'effacement #286).
   * L'historique financier (rattaché par `userId`) est conservé mais n'est plus
   * rattachable à une identité réelle. Iso `userStore.anonymizeUser` (partie
   * compte ; la suppression des sessions relève de `sessionRepository`).
   */
  anonymize(id: string): Promise<void>
}

export function createUserRepository(db: PrismaClient): UserRepository {
  return {
    findById(id) {
      return db.user.findUnique({ where: { id } })
    },
    findByContact(contact) {
      return db.user.findUnique({ where: { contact } })
    },
    findByGoogleId(googleId) {
      return db.user.findUnique({ where: { googleId } })
    },
    findByReferralCode(code) {
      return db.user.findUnique({ where: { referralCode: code } })
    },
    create(contact, role, profile) {
      return db.user.create({
        data: {
          contact,
          role,
          username: profile.username.trim(),
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          location: profile.location.trim(),
          latitude: profile.latitude ?? null,
          longitude: profile.longitude ?? null,
        },
      })
    },
    updateProfile(id, profile) {
      return db.user.update({
        where: { id },
        data: {
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
          location: profile.location,
        },
      })
    },
    clearPosition(id) {
      return db.user.update({ where: { id }, data: { latitude: null, longitude: null } })
    },
    async linkGoogleId(id, googleId) {
      await db.user.updateMany({ where: { id }, data: { googleId } })
    },
    async setPasswordHash(id, passwordHash) {
      await db.user.updateMany({ where: { id }, data: { passwordHash } })
    },
    async setReferralCode(id, referralCode) {
      await db.user.update({ where: { id }, data: { referralCode } })
    },
    async anonymize(id) {
      await db.user.update({
        where: { id },
        data: {
          contact: `compte-supprime-${id}@worktogo.invalid`,
          passwordHash: null,
          googleId: null,
          username: '',
          firstName: '',
          lastName: 'Compte supprimé',
          location: '',
          latitude: null,
          longitude: null,
        },
      })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const userRepository = createUserRepository(prisma)
