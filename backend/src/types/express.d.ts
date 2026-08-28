import type { User } from '@prisma/client'

/**
 * Augmente `Express.Request` avec l'utilisateur authentifié, posé par les gardes
 * d'auth (`src/middleware/auth.ts`). Optionnel : absent sur les routes publiques.
 */
declare global {
  namespace Express {
    interface Request {
      user?: User
      /**
       * Corps brut de la requête (Buffer), capturé par le `verify` d'`express.json`
       * (voir `config/server.ts`). Nécessaire à la vérification de signature HMAC
       * des webhooks opérateur, qui signent le texte exact reçu (#34/#193).
       */
      rawBody?: Buffer
    }
  }
}

export {}
