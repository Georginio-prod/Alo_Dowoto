import type { User } from '@prisma/client'
import { userService } from './userService'
import { verificationService } from './verificationService'
import { providerProfileService } from './providerProfileService'
import { subscriptionService } from './subscriptionService'
import { walletMovementRepository, type WalletMovementRepository } from '../repositories/walletMovementRepository'

/**
 * Droits RGPD sur le compte (#286) : portabilité (export) et effacement.
 * Orchestration **portée iso** depuis `server/api/account/*` (ADR-0016), en
 * réutilisant les domaines déjà portés (profil, abonnement, vérification,
 * portefeuille).
 */
export function createAccountService(wallet: WalletMovementRepository = walletMovementRepository) {
  return {
    /** GET /api/account/export → données personnelles structurées (JSON). */
    async exportData(user: User) {
      const providerProfile = user.role === 'prestataire' ? await providerProfileService.getProviderProfile(user.id) : null
      const subscription = user.role === 'prestataire' ? await subscriptionService.getSubscriptionByUserId(user.id) : null
      const verification = await verificationService.getVerification(user.id)

      return {
        exportedAt: Date.now(),
        account: await userService.toPublicUser(user),
        providerProfile,
        subscription,
        walletBalance: await wallet.getBalance(user.id),
        // N'inclut jamais les images (base64), seule leur existence/statut —
        // cohérent avec `GET /api/verification/me` qui ne les expose pas non plus.
        verification: verification
          ? { submittedAt: verification.submittedAt, purgedAt: verification.purgedAt }
          : null,
      }
    },

    /**
     * POST /api/account/delete → efface les images de vérification (donnée la
     * plus sensible) puis anonymise le compte. L'historique financier est
     * conservé (obligations comptables) mais dérattaché de l'identité réelle.
     */
    async deleteAccount(user: User): Promise<void> {
      await verificationService.deleteVerification(user.id)
      await userService.anonymizeUser(user.id)
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const accountService = createAccountService()
