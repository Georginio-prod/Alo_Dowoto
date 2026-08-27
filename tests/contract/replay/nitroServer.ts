import type { EventHandler, H3Error } from 'h3'
import { defineEventHandler, setResponseStatus } from 'h3'
import { startTestServer, type TestServer } from '../../setup/httpTestApp'

/**
 * Démarre le serveur Nitro de **référence** pour le rejeu de contrat, avec la
 * fidélité qui manque au harnais h3 brut : la réplication de l'**enveloppe
 * d'erreur JSON que Nitro applique en production** aux routes `/api/**` —
 * `{ error: true, url, statusCode, statusMessage, message, data }` (voir
 * `docs/architecture-api.md`). Sans elle, une route qui `throw badRequest(...)`
 * renverrait le `{ statusCode, stack }` par défaut de h3, jamais observé par les
 * clients — et aucun scénario d'erreur ne pourrait être rejoué iso.
 *
 * On enveloppe chaque handler : le succès passe inchangé ; une erreur h3 est
 * transformée en cette enveloppe via le flux h3 normal (`setResponseStatus` +
 * objet retourné), sans double écriture de réponse.
 */
function withNitroErrorEnvelope(handler: EventHandler): EventHandler {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (err) {
      const e = err as H3Error
      const statusCode = e.statusCode ?? 500
      setResponseStatus(event, statusCode)
      const data = (e as { data?: unknown }).data
      return {
        error: true,
        url: event.path,
        statusCode,
        statusMessage: e.statusMessage ?? '',
        message: e.message,
        ...(data !== undefined ? { data } : {}),
      }
    }
  })
}

export function startNitroServer(
  routes: { method: 'get' | 'post' | 'delete' | 'patch'; path: string; handler: EventHandler }[],
): Promise<TestServer> {
  return startTestServer(
    routes.map((route) => ({ ...route, handler: withNitroErrorEnvelope(route.handler) })),
  )
}
