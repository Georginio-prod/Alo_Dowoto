import type { Server } from 'node:http'

/**
 * Démarre le **vrai** backend Express (`backend/src/config/server.ts`) sur un
 * port éphémère, pour le rejeu de contrat. On importe `createServer` en dynamique
 * (et non en tête de module) pour garantir que `DATABASE_URL` est déjà fixé par
 * l'environnement Vitest **avant** que le singleton Prisma du backend ne soit
 * instancié — les deux runtimes tapent alors la MÊME base de test.
 *
 * Le backend écoute réellement (comme le serveur Nitro de `httpTestApp`) : le
 * rejeu envoie des requêtes `fetch` identiques aux deux, exerçant la vraie pile
 * (parsing JSON, middlewares, validation, gestion d'erreurs) sans réplique
 * manuelle. Symétrique du côté Nitro → comparaison statut + corps directe.
 */
export interface BackendServer {
  url: string
  close: () => Promise<void>
}

export async function startBackendServer(): Promise<BackendServer> {
  const { createServer } = await import('../../../backend/src/config/server')
  const app = createServer()

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    }),
  }
}
