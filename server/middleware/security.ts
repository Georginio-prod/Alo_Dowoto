/**
 * En-têtes de sécurité HTTP appliqués à toutes les réponses.
 *
 * Comble l'absence relevée à l'audit : aucun en-tête de durcissement n'était
 * posé jusqu'ici. On reste volontairement conservateur — pas de
 * Content-Security-Policy ici, car une CSP stricte casserait le script inline
 * d'application du thème (voir nuxt.config.ts, anti-flash) et le chargement des
 * Google Fonts. La CSP fera l'objet d'un chantier dédié, en même temps que
 * l'auto-hébergement des polices (issue « polices »), avec un `nonce` pour le
 * script inline.
 *
 * Les en-têtes posés ici sont sans risque de régression fonctionnelle :
 *  - X-Content-Type-Options : empêche le MIME-sniffing.
 *  - Referrer-Policy : ne fuite pas l'URL complète vers les tiers.
 *  - X-Frame-Options + frame-ancestors : anti-clickjacking (aucune mise en
 *    iframe du site n'est prévue).
 *  - Permissions-Policy : coupe les API sensibles non utilisées (la
 *    géolocalisation reste autorisée, elle sert à la distance GPS, #263).
 *  - Strict-Transport-Security : uniquement en production (HTTPS garanti).
 */
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), payment=(), geolocation=(self)',
  })

  if (process.env.NODE_ENV === 'production') {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})
