import { SECTORS } from '~~/app/data/sectors'

/**
 * sitemap.xml (#358, SEO technique) — liste les pages publiques indexables :
 * accueil, hub des catégories, une page par secteur (`/categories/:slug`), et
 * les pages d'assistance/légales. Les espaces privés/authentifiés en sont
 * exclus (cohérent avec robots.txt). L'origine est déduite de la requête pour
 * ne pas coder de domaine en dur (dev/preview/prod).
 */
const STATIC_PATHS = [
  '/',
  '/categories',
  '/formules',
  '/abonnement',
  '/a-propos',
  '/faq',
  '/aide',
  '/contact',
  '/cgu',
  '/confidentialite',
  '/cookies',
  '/mentions-legales',
]

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c] as string))
}

export default defineEventHandler((event) => {
  const origin = getRequestURL(event).origin
  const paths = [...STATIC_PATHS, ...SECTORS.map((sector) => `/categories/${sector.slug}`)]

  const urls = paths
    .map((path) => `  <url>\n    <loc>${escapeXml(origin + path)}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`)
    .join('\n')

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
})
