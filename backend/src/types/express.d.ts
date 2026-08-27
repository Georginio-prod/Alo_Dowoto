import type { User } from '@prisma/client'

/**
 * Augmente `Express.Request` avec l'utilisateur authentifié, posé par les gardes
 * d'auth (`src/middleware/auth.ts`). Optionnel : absent sur les routes publiques.
 */
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export {}
