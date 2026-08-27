import './instrument'
import { env } from './config/env'
import { createServer } from './config/server'

const app = createServer()

const server = app.listen(env.port, () => {
  console.warn(`[api] Alo_Dowoto backend à l'écoute sur le port ${env.port} (${env.nodeEnv})`)
})

/**
 * Arrêt gracieux (modèle repris de cnc-portal) : on ferme le serveur HTTP
 * proprement pour libérer le port et laisser les requêtes en cours se terminer.
 */
function shutdown(signal: string): void {
  console.warn(`[api] signal ${signal} reçu — arrêt en cours…`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
