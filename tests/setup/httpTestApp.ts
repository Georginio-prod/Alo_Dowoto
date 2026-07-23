import { createServer, type Server } from 'node:http'
import type { EventHandler } from 'h3'
import { createApp, createRouter, toNodeListener } from 'h3'

/**
 * Harnais de test HTTP (#261) : au lieu de mocker un `H3Event` à la main
 * (fragile — h3 en dépend de nombreux champs internes) ou de démarrer une
 * instance Nuxt/Nitro complète (lourd, lent, nécessite un build), on monte
 * un vrai serveur `node:http` sur un port éphémère avec une vraie instance
 * h3 (la brique sur laquelle Nitro lui-même est construit) et on lui
 * envoie de vraies requêtes HTTP via `fetch`. Autorisation, cookies, corps
 * JSON, en-têtes et codes de statut sont donc exercés tels qu'en
 * production, sans réplique manuelle de leur sémantique.
 *
 * Les identifiants de route (`server/api/**`) n'ont eux-mêmes aucun import
 * (Nitro les injecte au build) — voir vitest.config.ts, qui réplique cet
 * auto-import pour que ces fichiers restent chargeables tels quels ici.
 */

export interface TestServer {
  /** Base URL du serveur de test (ex. http://127.0.0.1:54231). */
  url: string
  close: () => Promise<void>
}

/**
 * Démarre un serveur de test exposant les routes fournies. `routes` associe
 * un chemin h3 (peut contenir des paramètres `:id`) à son handler — même
 * syntaxe que `createRouter().post(path, handler)`.
 */
export async function startTestServer(
  routes: { method: 'get' | 'post' | 'delete' | 'patch'; path: string; handler: EventHandler }[],
  middleware: EventHandler[] = [],
): Promise<TestServer> {
  const app = createApp()
  for (const handler of middleware) {
    app.use(handler)
  }
  const router = createRouter()
  for (const route of routes) {
    router[route.method](route.path, route.handler)
  }
  app.use(router)

  const server: Server = createServer(toNodeListener(app))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    }),
  }
}
