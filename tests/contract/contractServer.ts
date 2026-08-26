import type { EventHandler } from 'h3'
import { discoverApiRoutes } from './loadApiRoutes'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

/**
 * Monte l'intégralité des routes `server/api/**` (Nitro actuel) sur un vrai
 * serveur HTTP de test — l'« application de contrat ». On peut alors envoyer de
 * vraies requêtes et capturer statut + corps pour figer le comportement de
 * référence (voir *.contract.test.ts). Le même jeu de requêtes sera rejoué
 * contre le backend Express pour prouver l'iso-fonctionnement (ADR-0016).
 *
 * Le chargement est résilient : un handler qui ne s'importe pas est collecté
 * dans `loadErrors` au lieu de faire planter tout le harnais — c'est en soi un
 * résultat de contrat (aucun handler ne doit être orphelin).
 */

export interface RouteLoadError {
  route: string
  error: string
}

export interface ContractServer extends TestServer {
  routeCount: number
  loadErrors: RouteLoadError[]
}

export async function startContractServer(): Promise<ContractServer> {
  const discovered = discoverApiRoutes()
  const loaded: { method: 'get' | 'post' | 'patch' | 'delete'; path: string; handler: EventHandler }[] = []
  const loadErrors: RouteLoadError[] = []

  for (const route of discovered) {
    try {
      loaded.push({ method: route.method, path: route.routePath, handler: await route.load() })
    } catch (error) {
      loadErrors.push({
        route: `${route.method.toUpperCase()} ${route.routePath}`,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const server = await startTestServer(loaded)
  return Object.assign(server, { routeCount: loaded.length, loadErrors })
}
