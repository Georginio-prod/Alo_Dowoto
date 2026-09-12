import './instrument'
import { env } from './config/env'
import { createServer } from './config/server'
import { deliveryStatus, describeDeliveryStatus } from './utils/deliveryStatus'

const app = createServer()

const server = app.listen(env.port, () => {
  console.warn(`[api] Alo_Dowoto backend à l'écoute sur le port ${env.port} (${env.nodeEnv})`)
  // Canaux OTP/notifications : rend visible dès le démarrage un `.env` incomplet
  // (ex. clé Brevo posée dans le mauvais fichier) au lieu de le découvrir au
  // premier code qui n'arrive pas. En production, un canal absent est une erreur.
  const delivery = deliveryStatus()
  const line = `[delivery] ${describeDeliveryStatus(delivery)}`
  if (env.isProd && (!delivery.email || !delivery.sms)) console.error(`${line} — canal manquant en production, l'OTP répondra 503 sur ce canal`)
  else console.warn(line)
})

/**
 * Arrêt gracieux : on ferme le serveur HTTP
 * proprement pour libérer le port et laisser les requêtes en cours se terminer.
 */
function shutdown(signal: string): void {
  console.warn(`[api] signal ${signal} reçu — arrêt en cours…`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
