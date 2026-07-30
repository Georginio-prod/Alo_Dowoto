import { expect, test } from '@playwright/test'
import { gotoHydrated } from './helpers/hydration'
import { signupViaApi, TEST_PASSWORD } from './helpers/auth'

/**
 * Formulaires publics et formulaires de compte : ils sont rarement rejoués à la
 * main après une refonte, alors qu'un envoi cassé ne laisse aucune trace côté
 * visiteur (il croit avoir écrit au support).
 */

test('une réclamation est enregistrée et renvoie une référence', async ({ page }) => {
  await gotoHydrated(page, '/reclamation')

  await page.getByLabel('Catégorie').selectOption({ index: 1 })
  await page.getByLabel('Sujet').fill('Problème avec une prestation')
  await page.getByLabel('Message').fill('Le prestataire n’est jamais venu au rendez-vous convenu.')
  await page.getByLabel('Email ou téléphone de contact').fill('90112233')
  await page.getByRole('button', { name: /Envoyer/ }).click()

  await expect(page.getByText('Votre réclamation a bien été enregistrée.')).toBeVisible()
  await expect(page.getByText('Référence :')).toBeVisible()
})

test('un témoignage publié depuis l’accueil apparaît dans la liste', async ({ page }) => {
  const message = `Excellente expérience de test ${Date.now()}`

  await gotoHydrated(page, '/')
  await page.getByLabel('Votre nom').fill('Ama K.')
  await page.getByLabel('Votre avis').fill(message)
  await page.getByRole('button', { name: /5 étoile/ }).click()
  await page.getByRole('button', { name: /Publier mon avis/ }).click()

  await expect(page.getByText('Merci, votre avis a été publié !')).toBeVisible()

  const response = await page.request.get('/api/testimonials')
  expect(response.ok()).toBeTruthy()
  expect(JSON.stringify(await response.json())).toContain(message)
})

test('changement de mot de passe depuis « Mon espace »', async ({ page }) => {
  const user = await signupViaApi(page, 'client')
  const newPassword = 'NouveauMotDePasse2!'

  await gotoHydrated(page, '/mot-de-passe')
  await page.getByLabel('Mot de passe actuel').fill(TEST_PASSWORD)
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirmer le nouveau mot de passe').fill(newPassword)
  await page.getByRole('button', { name: 'Confirmer' }).click()

  await expect(page.getByText(/mis à jour|modifié/i)).toBeVisible()

  // Le nouveau mot de passe est bien celui accepté à la reconnexion. Chaque
  // tentative consomme la vérification OTP (voir consumeVerifiedContact) : il
  // en faut donc une par essai, comme pour un vrai utilisateur.
  await page.request.delete('/api/auth/session')

  async function attemptLogin(password: string) {
    const sent = await page.request.post('/api/auth/otp/send', { data: { method: 'phone', value: user.phone } })
    const { devCode } = (await sent.json()) as { devCode?: string }
    await page.request.post('/api/auth/otp/verify', { data: { method: 'phone', value: user.phone, code: devCode } })
    return page.request.post('/api/auth/session', { data: { method: 'phone', value: user.phone, password } })
  }

  expect((await attemptLogin(TEST_PASSWORD)).status(), 'l’ancien mot de passe doit être refusé').toBe(401)

  const withNewPassword = await attemptLogin(newPassword)
  expect(withNewPassword.ok(), `nouveau mot de passe → ${withNewPassword.status()}`).toBeTruthy()
})

test('modification du profil d’identité', async ({ page }) => {
  await signupViaApi(page, 'client')

  // /profil/identite ouvre la section « Identité » du hub profil, en panneau.
  await gotoHydrated(page, '/profil/identite')
  await page.getByRole('button', { name: /^Identité/ }).click()
  await page.getByLabel('Prénom').fill('Amavi')
  await page.getByLabel('Nom', { exact: true }).fill('Koffi')
  await page.getByRole('button', { name: /Enregistrer/ }).click()

  await expect(page.getByText(/mis à jour|enregistré/i).first()).toBeVisible()

  // Lecture par sondage : sur un appareil lent, l'assertion pouvait précéder la
  // fin de l'enregistrement côté serveur.
  await expect
    .poll(async () => {
      const session = await page.request.get('/api/auth/session')
      const { user } = await session.json()
      return `${user.firstName} ${user.lastName}`
    })
    .toBe('Amavi Koffi')
})
