import { expect, test } from '@playwright/test'
import { gotoHydrated } from './helpers/hydration'

test('le pied de page mène aux pages légales', async ({ page }) => {
  await gotoHydrated(page, '/')

  for (const [label, path] of [
    ['Mentions légales', '/mentions-legales'],
    ['CGU', '/cgu'],
    ['Confidentialité', '/confidentialite'],
    ['Cookies', '/cookies'],
  ] as const) {
    await gotoHydrated(page, '/')
    await page.getByRole('link', { name: label, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(path))
    await expect(page.getByRole('heading').first()).toBeVisible()
  }
})

test('bascule français ↔ anglais', async ({ page }) => {
  await gotoHydrated(page, '/')
  await expect(page.locator('html')).toHaveAttribute('lang', /fr/)

  await page.getByRole('button', { name: /English|Passer en English/ }).first().click()

  await expect(page.locator('html')).toHaveAttribute('lang', /en/)
  await expect(page.getByRole('link', { name: /Log in|Sign in/i }).first()).toBeVisible()
})

test('bascule de thème', async ({ page }) => {
  await gotoHydrated(page, '/')
  const initial = await page.locator('html').getAttribute('data-theme')

  // `force` : le bouton flotte au-dessus de la page d'accueil, dont les
  // animations d'apparition (et le bandeau de logos, en boucle) font échouer le
  // test de « stabilité » de Playwright pendant plusieurs secondes.
  await page.getByRole('button', { name: /Thème/ }).first().click({ force: true })

  await expect
    .poll(() => page.locator('html').getAttribute('data-theme'))
    .not.toBe(initial)

  // Le thème doit survivre à un rechargement (stocké dans localStorage).
  const chosen = await page.locator('html').getAttribute('data-theme')
  await page.reload()
  expect(await page.locator('html').getAttribute('data-theme')).toBe(chosen)
})

test('l’en-tête ramène à l’accueil et propose la connexion', async ({ page }) => {
  await gotoHydrated(page, '/faq')
  await page.getByRole('link', { name: 'WorkTogo' }).first().click()
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('link', { name: 'Se connecter' }).first().click()
  await expect(page).toHaveURL(/\/auth/)
})
