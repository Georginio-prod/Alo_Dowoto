import { expect, test } from '@playwright/test'
import { collectPageErrors } from './helpers/page-errors'

/**
 * Balayage de toutes les pages accessibles sans compte : chacune doit
 * répondre 200, afficher un titre de premier niveau et ne produire aucune
 * erreur JavaScript.
 */
const PUBLIC_PAGES = [
  '/',
  '/categories',
  '/categories/btp',
  '/categories/digital',
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

for (const path of PUBLIC_PAGES) {
  test(`la page ${path} s'affiche sans erreur`, async ({ page }) => {
    const errors = collectPageErrors(page)

    const response = await page.goto(path)
    expect(response?.status(), `statut HTTP de ${path}`).toBeLessThan(400)

    // Une page Nuxt en erreur rend son écran « An error has occurred ».
    await expect(page.locator('body')).not.toContainText('An error has occurred')
    await expect(page.locator('h1, h2').first()).toBeVisible()

    expect(errors.messages, `erreurs JavaScript sur ${path}`).toEqual([])
  })
}

test('/paiement renvoie un visiteur non connecté vers l’inscription prestataire', async ({ page }) => {
  // Page de fin de parcours d'abonnement : elle interroge /api/subscriptions/me
  // et redirige elle-même, elle n'est donc pas « publique » (d'où son absence
  // de la liste ci-dessus, où l'appel non authentifié compterait comme erreur).
  await page.goto('/paiement')
  await expect(page).toHaveURL(/\/auth\?.*role=prestataire/)
})

test('une URL inconnue rend la page 404 et non une erreur serveur', async ({ page }) => {
  const response = await page.goto('/cette-page-nexiste-pas')
  expect(response?.status()).toBe(404)
  await expect(page.locator('body')).toContainText(/404|introuvable|not found/i)
})
