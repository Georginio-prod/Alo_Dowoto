/**
 * robots.txt (#358, SEO technique) — servi dynamiquement pour référencer le
 * sitemap avec l'origine réelle de la requête (pas de domaine codé en dur).
 * Autorise l'exploration des pages publiques (accueil, catégories, pages
 * d'assistance/légales) et bloque les espaces privés/authentifiés et l'API.
 */
export default defineEventHandler((event) => {
  const origin = getRequestURL(event).origin
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /auth',
    'Disallow: /profil',
    'Disallow: /solde',
    'Disallow: /favoris',
    'Disallow: /paiement',
    'Disallow: /demande',
    'Disallow: /reclamation',
    'Disallow: /mot-de-passe',
    'Disallow: /messages',
    'Disallow: /prestataire',
    'Disallow: /dashboard',
    'Disallow: /matching',
    'Disallow: /api',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
})
