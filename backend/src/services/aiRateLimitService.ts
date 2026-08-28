import { aiRateWindowRepository, type AiRateWindowRepository } from '../repositories/aiRateWindowRepository'

/**
 * Limitation de débit de l'assistant IA (#geoloc, 2.2), porté iso depuis
 * `server/utils/aiRateLimiter.ts` (ADR-0016) : fenêtre fixe persistée
 * (`AiRateWindow`), clé par utilisateur connecté ou par adresse IP anonyme.
 * Persistée (et non en mémoire) pour que la protection anti-emballement des
 * coûts soit partagée entre instances et survive aux déploiements.
 */
const WINDOW_MS = 60_000
export const AI_RATE_LIMIT_PER_WINDOW = 8

export function createAiRateLimitService(repo: AiRateWindowRepository = aiRateWindowRepository) {
  return {
    /**
     * Enregistre une requête pour `key` et indique si la limite est dépassée. La
     * `limit`-ième requête de la fenêtre passe encore ; la suivante est bloquée.
     */
    async isRateLimited(key: string, limit: number = AI_RATE_LIMIT_PER_WINDOW, windowMs: number = WINDOW_MS): Promise<boolean> {
      const now = Date.now()
      const windowStart = new Date(Math.floor(now / windowMs) * windowMs)

      await repo.purgeOlderThan(new Date(now - windowMs))
      const count = await repo.incrementAndCount(key, windowStart)
      return count > limit
    },

    /** Réinitialise le compteur d'une clé (toutes fenêtres). */
    async resetRateLimit(key: string): Promise<void> {
      await repo.reset(key)
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const aiRateLimitService = createAiRateLimitService()
