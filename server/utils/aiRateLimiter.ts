import { prisma } from '~~/server/utils/prisma'

/**
 * Limitation de débit de l'assistant IA (#geoloc, 2.2) — fenêtre fixe persistée
 * en base (table `AiRateWindow`, audit M4). Clé par utilisateur connecté, ou par
 * adresse IP pour un visiteur anonyme (voir server/api/assistant/chat.post.ts).
 *
 * Persistée et non plus en mémoire pour que la protection contre l'emballement
 * des coûts Anthropic soit partagée entre instances et survive aux
 * déploiements (l'ancien registre en mémoire se réinitialisait à chaque
 * redémarrage et ne voyait pas les requêtes servies par un autre process).
 *
 * Fenêtre fixe (plutôt que glissante) : une ligne par (clé, début de fenêtre),
 * `count` incrémenté atomiquement par `upsert`. Les fenêtres périmées sont
 * purgées à la volée — la table reste bornée par le nombre de clés actives
 * récentes.
 */
const WINDOW_MS = 60_000
export const AI_RATE_LIMIT_PER_WINDOW = 8

/**
 * Enregistre une requête pour `key` et indique si la limite est dépassée. La
 * `limit`-ième requête de la fenêtre passe encore ; la suivante est bloquée.
 */
export async function isRateLimited(
  key: string,
  limit: number = AI_RATE_LIMIT_PER_WINDOW,
  windowMs: number = WINDOW_MS,
): Promise<boolean> {
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)

  // Purge des fenêtres antérieures à la fenêtre courante (housekeeping).
  await prisma.aiRateWindow.deleteMany({ where: { windowStart: { lt: new Date(now - windowMs) } } })

  const row = await prisma.aiRateWindow.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  })

  return row.count > limit
}

/**
 * Réinitialise le compteur d'une clé (toutes fenêtres). Utile pour un anti
 * brute-force de connexion : on remet à zéro après une authentification
 * réussie, afin que seules les tentatives infructueuses s'accumulent vers le
 * blocage (voir server/api/admin/login.post.ts).
 */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.aiRateWindow.deleteMany({ where: { key } })
}
