import { expect, test } from '@playwright/test'
import { gotoForLayout } from './helpers/hydration'

/**
 * Aucun lien interne ne doit mener à une page inexistante.
 *
 * Les liens morts ne se voient pas au développement (on ne clique jamais tout)
 * mais coûtent un visiteur à chaque fois. On collecte donc tous les `href`
 * internes des pages publiques et on vérifie leur statut.
 */
const PAGES_TO_CRAWL = [
  '/',
  '/categories',
  '/categories/btp',
  '/resultats',
  '/formules',
  '/aide',
  '/faq',
  '/contact',
  '/a-propos',
  '/cgu',
  '/confidentialite',
  '/cookies',
  '/mentions-legales',
  '/reclamation',
  '/auth',
]

test('aucun lien interne ne pointe vers une page inexistante', async ({ page }) => {
  test.setTimeout(300_000)

  const collected = new Map<string, string>() // href → page qui le contient
  for (const path of PAGES_TO_CRAWL) {
    await gotoForLayout(page, path)
    const hrefs = await page.$$eval('a[href]', anchors =>
      anchors.map(a => a.getAttribute('href') ?? '').filter(href => href.startsWith('/')),
    )
    for (const href of hrefs) {
      // Les ancres internes (#secteurs) ne sont pas des routes.
      const [route] = href.split('#')
      if (route && !collected.has(route)) collected.set(route, path)
    }
  }

  expect(collected.size, 'aucun lien collecté : la collecte est cassée').toBeGreaterThan(10)

  const broken: string[] = []
  for (const [href, source] of collected) {
    const response = await page.request.get(href, { maxRedirects: 5 })
    if (response.status() >= 400) broken.push(`${href} (lié depuis ${source}) → ${response.status()}`)
  }

  expect(broken, `liens internes cassés :\n  ${broken.join('\n  ')}`).toEqual([])
})
