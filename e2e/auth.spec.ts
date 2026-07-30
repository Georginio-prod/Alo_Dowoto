import { expect, type Page, test } from '@playwright/test'
import { clickWhenReady, gotoHydrated } from './helpers/hydration'
import { fillOtp, readDevCode, signupViaApi, TEST_PASSWORD, uniquePhone } from './helpers/auth'

/**
 * Ouvre /auth et attend que le formulaire soit réellement interactif.
 *
 * L'hydratation du layout ne suffit pas : le composant de page arrive derrière
 * un `<Suspense>`. On sonde donc l'interactivité avec la bascule
 * Téléphone/Email, sans effet de bord (contrairement à « Se connecter », qui
 * enverrait un OTP).
 */
async function openAuthPage(page: Page, path = '/auth'): Promise<void> {
  await gotoHydrated(page, path)
  await clickWhenReady(page.getByRole('button', { name: 'Email', exact: true }), page.getByLabel('Adresse email'))
  await clickWhenReady(page.getByRole('button', { name: 'Téléphone', exact: true }), page.getByLabel('Numéro de téléphone'))
}

/** Pages « Mon espace » : un visiteur non connecté doit être renvoyé vers /auth. */
const PROTECTED_PAGES = [
  '/dashboard/client',
  '/messages',
  '/favoris',
  '/profil',
  '/profil/identite',
  '/profil/verification',
  '/solde',
  '/mot-de-passe',
  '/parrainage',
  '/prestataire',
  '/prestataire/demandes',
  '/prestataire/solde',
]

for (const path of PROTECTED_PAGES) {
  test(`${path} renvoie un visiteur non connecté vers /auth`, async ({ page }) => {
    // `commit` : le middleware redirige pendant le chargement, ce qui fait
    // avorter la navigation initiale (`net::ERR_ABORTED`). Seule l'URL finale
    // compte ici, et `toHaveURL` réessaie jusqu'à ce qu'elle soit stable.
    await page.goto(path, { waitUntil: 'commit' })
    await expect(page).toHaveURL(/\/auth(\?|$)/)
  })
}

test("inscription complète d'un client depuis l'interface", async ({ page }) => {
  const phone = uniquePhone()

  await openAuthPage(page)
  await clickWhenReady(
    page.getByRole('button', { name: 'Inscription', exact: true }),
    page.getByLabel("Nom d'utilisateur"),
  )

  // Étape 1 — identité + contact.
  await page.getByLabel("Nom d'utilisateur").fill(`e2e_${phone}`)
  await page.getByLabel('Prénom').fill('Marie')
  await page.getByLabel('Nom', { exact: true }).fill('Dupont')
  await page.getByLabel('Localisation').fill('Lomé')
  await page.getByLabel('Numéro de téléphone').fill(phone)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  // Étape 2 — code OTP. Hors production et sans provider SMS configuré, le
  // code est affiché par l'interface (« Mode développement — code : … »).
  // La saisie du 6e chiffre déclenche la vérification (voir AuthOtpStep).
  await fillOtp(page, await readDevCode(page))

  // Étape 3 — mot de passe.
  await expect(page.getByText('Créer votre mot de passe')).toBeVisible()
  await page.getByLabel('Mot de passe', { exact: true }).fill(TEST_PASSWORD)
  await page.getByLabel('Confirmer le mot de passe').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Continuer' }).click()

  // Étape 4 — vérification d'identité, que l'on peut repousser.
  await expect(page.getByText("Vérification d'identité")).toBeVisible()
  await page.getByRole('button', { name: "Passer pour l'instant" }).click()

  // Le client atterrit sur les résultats, connecté.
  await expect(page).toHaveURL(/\/resultats/)
  const session = await page.request.get('/api/auth/session')
  expect(session.ok()).toBeTruthy()
  expect((await session.json()).user.role).toBe('client')
})

test('reconnexion avec mot de passe', async ({ page }) => {
  const user = await signupViaApi(page, 'client')

  // Déconnexion : on repart d'un contexte vierge côté navigateur.
  await page.request.delete('/api/auth/session')
  await openAuthPage(page)

  await page.getByLabel('Numéro de téléphone').fill(user.phone)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

  // La saisie du 6e chiffre déclenche la vérification (voir AuthOtpStep).
  await fillOtp(page, await readDevCode(page))

  await page.getByLabel('Mot de passe').fill(user.password)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

  await expect(page).toHaveURL(/\/resultats/)
})

test('un mauvais code OTP est refusé', async ({ page }) => {
  await openAuthPage(page)
  await page.getByLabel('Numéro de téléphone').fill(uniquePhone())
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

  await fillOtp(page, '000000')
  await expect(page.getByText(/Code invalide|Code expiré/)).toBeVisible()
})
