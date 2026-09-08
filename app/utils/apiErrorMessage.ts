/**
 * Extrait le message d'erreur renvoyé par l'API (champ `message` du corps
 * JSON des erreurs de l'API, posé par backend/src/middleware/errorHandler.ts). `$fetch`
 * expose le corps parsé sous `error.data`.
 *
 * Remplace l'ancienne lecture de `error.statusMessage` : h3 assainit la
 * ligne de statut HTTP (accents français altérés + warning serveur à
 * chaque erreur), alors que le corps JSON transporte le message intact.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: string } })?.data?.message
  return message || fallback
}
