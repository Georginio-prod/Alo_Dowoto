import { randomBytes } from 'node:crypto'

/**
 * En-têtes de sécurité HTTP appliqués à toutes les réponses.
 *
 * Comble l'absence relevée à l'audit : aucun en-tête de durcissement n'était
 * posé jusqu'ici. Les en-têtes ci-dessous sont sans risque de régression
 * fonctionnelle :
 *  - X-Content-Type-Options : empêche le MIME-sniffing.
 *  - Referrer-Policy : ne fuite pas l'URL complète vers les tiers.
 *  - X-Frame-Options + frame-ancestors : anti-clickjacking (aucune mise en
 *    iframe du site n'est prévue).
 *  - Permissions-Policy : coupe les API sensibles non utilisées (la
 *    géolocalisation reste autorisée, elle sert à la distance GPS, #263).
 *  - Strict-Transport-Security : uniquement en production (HTTPS garanti).
 *
 * La Content-Security-Policy complète (#354) était volontairement différée
 * (elle aurait cassé le script de thème inline et, avant #341, les Google
 * Fonts) : les polices sont désormais auto-hébergées et le script de thème
 * est autorisé via un nonce par requête (voir server/plugins/cspNonce.ts, qui
 * l'injecte aussi sur le script interne `window.__NUXT__.config` généré par
 * Nuxt lui-même — son contenu variant par requête, il ne peut pas être
 * couvert par un hash statique). Le nonce est généré ici (première
 * exécution garantie pour chaque requête) et posé sur `event.context` pour
 * que le hook `render:html` du plugin puisse le relire.
 *
 * La CSP complète n'est appliquée qu'en production, comme HSTS ci-dessus —
 * le serveur de dev Vite (HMR, module reload) a besoin d'`eval` et de
 * websockets que la CSP de prod bloquerait sans bénéfice (aucun utilisateur
 * final ne charge le serveur de dev).
 */
export default defineEventHandler((event) => {
  const nonce = randomBytes(16).toString('base64')
  event.context.cspNonce = nonce

  const productionCsp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // Nuxt (SSR/hydratation) et de nombreux composants de cette app posent des
    // styles inline (`:style`, animations) : pas d'alternative par nonce pour
    // les attributs `style=""` (seuls les blocs <style> peuvent en porter un).
    // Risque XSS bien moindre que script-src, compromis répandu.
    "style-src 'self' 'unsafe-inline'",
    // Avatars/photos de profil : URL externes soumises par le prestataire
    // (server/api/providers/me.patch.ts, pas de liste blanche de domaines) et
    // pièces jointes de vérification en data URI (server/utils/verificationStore.ts).
    "img-src 'self' https: data:",
    "font-src 'self'",
    // Sentry (#262) : DSN vide par défaut (inactif), autorisé par avance pour
    // ne pas nécessiter de redéploiement le jour où NUXT_PUBLIC_SENTRY_DSN est renseigné.
    // Nominatim (#geoloc, AuthContactStep.vue et LocationRadiusPicker.vue) :
    // géocodage inverse/direct restreint au Togo, appelé depuis le navigateur.
    // Sans cette entrée, ces appels étaient déjà bloqués en production
    // (échec silencieux, sans régression visible côté utilisateur — voir le
    // commentaire de useMyLocation dans AuthContactStep.vue) ; corrigé ici en
    // même temps que ce chantier en ajoute un second usage.
    "connect-src 'self' https://*.sentry.io https://nominatim.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': process.env.NODE_ENV === 'production' ? productionCsp : "frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), payment=(), geolocation=(self)',
  })

  if (process.env.NODE_ENV === 'production') {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})
