/**
 * Injecte le nonce CSP (#354, généré par request dans
 * server/middleware/security.ts, posé sur `event.context.cspNonce`) sur
 * chaque balise <script> du HTML rendu :
 *  - le script de thème inline (nuxt.config.ts, anti-flash) ;
 *  - le script interne `window.__NUXT__.config` que Nuxt génère lui-même
 *    pour transmettre la config publique au client — son contenu varie par
 *    requête (il ne peut donc pas être couvert par un hash statique).
 *
 * Sans nonce sur ces deux scripts, la CSP stricte de production les
 * bloquerait silencieusement : aucune erreur serveur, seulement une
 * violation visible dans la console du navigateur.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = event.context.cspNonce
    if (!nonce) return

    html.head = html.head.map((chunk) => addNonceToScripts(chunk, nonce))
    html.bodyPrepend = html.bodyPrepend.map((chunk) => addNonceToScripts(chunk, nonce))
    html.bodyAppend = html.bodyAppend.map((chunk) => addNonceToScripts(chunk, nonce))
  })
})

export function addNonceToScripts(chunk: string, nonce: string): string {
  return chunk.replace(/<script(?![^>]*\bnonce=)([^>]*)>/g, (_match, attrs: string) => `<script nonce="${nonce}"${attrs}>`)
}
