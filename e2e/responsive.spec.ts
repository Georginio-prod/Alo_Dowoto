import { expect, test, type Page } from '@playwright/test'
import { signupViaApi } from './helpers/auth'
import { createVisibleProvider } from './helpers/provider'
import { gotoForLayout, gotoHydrated } from './helpers/hydration'

/**
 * Aucune page ne doit défiler horizontalement sur un petit écran.
 *
 * 320 px est la largeur des plus petits téléphones encore courants, 375 px
 * celle d'un iPhone SE/8 — deux tailles très représentées au Togo. Un
 * débordement de quelques pixels suffit à rendre toute la page « baladeuse »
 * sous le doigt, symptôme le plus visible d'une mise en page cassée.
 *
 * En cas d'échec, le message liste les éléments fautifs (les plus profonds),
 * en ignorant ceux qui vivent dans un conteneur à défilement propre (table
 * comparative des formules, onglets du tableau de bord…) puisqu'ils ne
 * débordent pas de la page.
 */
const WIDTHS = [320, 375]

// Ces tests fixent eux-mêmes la taille du viewport : les rejouer dans le projet
// « mobile » ne testerait rien de plus (seule l'émulation tactile diffère) et
// doublerait une centaine de rendus.
test.beforeEach(({ browserName }, testInfo) => {
  void browserName
  test.skip(testInfo.project.name !== 'chromium', 'largeurs déjà pilotées par le test')
})

const PUBLIC_PAGES = [
  '/',
  '/categories',
  '/categories/btp',
  '/resultats',
  '/resultats?q=plomberie',
  '/demande',
  '/formules',
  '/abonnement',
  '/aide',
  '/faq',
  '/contact',
  '/a-propos',
  '/reclamation',
  '/cgu',
  '/confidentialite',
  '/cookies',
  '/mentions-legales',
  '/auth',
  '/auth?role=prestataire',
]

const CLIENT_PAGES = [
  '/dashboard/client',
  '/favoris',
  '/messages',
  '/profil',
  '/profil/identite',
  '/profil/verification',
  '/solde',
  '/mot-de-passe',
  '/parrainage',
]

const PROVIDER_PAGES = [
  '/prestataire',
  '/prestataire/demandes',
  '/prestataire/profil-professionnel',
  '/prestataire/coordonnees',
  '/prestataire/cv',
  '/prestataire/langues',
  '/prestataire/formation',
  '/prestataire/certifications',
  '/prestataire/preferences',
  '/prestataire/solde',
]

interface OverflowReport {
  overflow: number
  culprits: string[]
}

async function findOverflow(page: Page, viewportWidth: number): Promise<OverflowReport | null> {
  return page.evaluate((vw) => {
    const overflow = document.documentElement.scrollWidth - vw
    if (overflow <= 1) return null

    const culprits: string[] = []
    for (const element of Array.from(document.body.querySelectorAll('*'))) {
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      if (rect.right + window.scrollX <= vw + 1 && rect.left >= -1) continue

      const style = getComputedStyle(element)
      if (style.position === 'fixed') continue

      let insideScroller = false
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX !== 'visible') { insideScroller = true; break }
      }
      if (insideScroller) continue

      culprits.push(`<${element.tagName.toLowerCase()} class="${String(element.className).slice(0, 80)}"> largeur ${Math.round(rect.width)}px, bord droit à ${Math.round(rect.right + window.scrollX)}px`)
    }
    return { overflow, culprits: culprits.slice(-4) }
  }, viewportWidth)
}

async function expectNoOverflow(page: Page, paths: string[], widths: number[] = WIDTHS) {
  // Chaque test parcourt plusieurs dizaines de rendus (pages × largeurs) : le
  // délai par défaut (60 s) ne suffit pas, surtout à froid en dev.
  test.setTimeout(300_000)
  for (const path of paths) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      await gotoForLayout(page, path)
      const report = await findOverflow(page, width)
      expect(
        report,
        report
          ? `${path} déborde de ${report.overflow}px à ${width}px de large :\n  ${report.culprits.join('\n  ')}`
          : '',
      ).toBeNull()
    }
  }
}

test('aucun débordement horizontal sur les pages publiques', async ({ page }) => {
  await expectNoOverflow(page, PUBLIC_PAGES)
})

test('aucun débordement horizontal dans l’espace chercheur', async ({ page }) => {
  await signupViaApi(page, 'client')
  await expectNoOverflow(page, CLIENT_PAGES, [375])
})

test('aucun débordement horizontal dans l’espace prestataire', async ({ page }) => {
  await createVisibleProvider(page)
  await expectNoOverflow(page, PROVIDER_PAGES, [375])
})

/**
 * Les panneaux qui n'existent qu'une fois ouverts (modales, tiroir de secteur,
 * assistant) échappent au balayage des pages : on les ouvre explicitement.
 */
test('aucun débordement horizontal quand les panneaux sont ouverts', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })

  await gotoHydrated(page, '/')
  await page.getByLabel('Rechercher un service').first().fill('plomberie')
  await page.getByLabel('Rechercher un service').first().press('Enter')
  await expect(page.getByText('Je cherche un service')).toBeVisible()
  expect(await findOverflow(page, 320), 'modale de choix de compte').toBeNull()
  await page.getByRole('button', { name: 'Annuler' }).click()

  await page.getByRole('button', { name: /Artisanat & BTP/ }).first().click()
  await expect(page.getByRole('button', { name: 'Plomberie' })).toBeVisible()
  expect(await findOverflow(page, 320), 'tiroir des sous-secteurs').toBeNull()
  await page.keyboard.press('Escape')

  await gotoHydrated(page, '/')
  await page.getByRole('button', { name: /assistant/i }).first().click()
  await expect(page.getByRole('button', { name: /Envoyer|Fermer/i }).first()).toBeVisible()
  expect(await findOverflow(page, 320), 'panneau de l’assistant').toBeNull()
})
