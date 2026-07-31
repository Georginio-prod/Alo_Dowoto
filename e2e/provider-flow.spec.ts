import { expect, test } from '@playwright/test'
import { signupViaApi } from './helpers/auth'
import { collectPageErrors } from './helpers/page-errors'
import { createVisibleProvider } from './helpers/provider'

/** Toutes les pages de l'espace prestataire, une fois connecté. */
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

test('espace prestataire : toutes les pages s’affichent sans erreur', async ({ page }) => {
  const errors = collectPageErrors(page)
  await createVisibleProvider(page)

  for (const path of PROVIDER_PAGES) {
    const response = await page.goto(path)
    expect(response?.status(), `statut HTTP de ${path}`).toBeLessThan(400)
    await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')))
    await expect(page.locator('body'), path).not.toContainText('An error has occurred')
  }

  expect(errors.messages, 'erreurs JavaScript dans l’espace prestataire').toEqual([])
})

test('un client est renvoyé vers son espace s’il ouvre l’espace prestataire', async ({ page }) => {
  await signupViaApi(page, 'client')

  await page.goto('/prestataire')
  await expect(page).toHaveURL(/\/dashboard\/client/)

  await page.goto('/prestataire/solde')
  await expect(page).toHaveURL(/\/dashboard\/client/)
})

test('mise à jour du profil professionnel', async ({ page }) => {
  await createVisibleProvider(page)

  const response = await page.request.patch('/api/providers/me', {
    data: { description: 'Nouvelle description de mon activité.' },
  })
  expect(response.ok(), `PATCH /api/providers/me → ${response.status()}`).toBeTruthy()

  const me = await page.request.get('/api/providers/me')
  expect(me.ok()).toBeTruthy()
  expect(JSON.stringify(await me.json())).toContain('Nouvelle description')
})
