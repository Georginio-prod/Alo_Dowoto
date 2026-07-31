import { expect, test } from '@playwright/test'
import { gotoHydrated } from './helpers/hydration'
import { signupViaApi, verifyIdentityViaApi } from './helpers/auth'
import { createVisibleProvider } from './helpers/provider'

test('la recherche d’un visiteur non connecté propose de choisir son profil', async ({ page }) => {
  await gotoHydrated(page, '/')
  await page.getByLabel('Rechercher un service').first().fill('plomberie')
  await page.getByLabel('Rechercher un service').first().press('Enter')

  // Un visiteur non connecté passe d'abord par la modale « Que souhaitez-vous
  // faire ? » (voir AppHeader.onSearch / ChoiceModal).
  await expect(page.getByText('Recherche : "plomberie"')).toBeVisible()
  await page.getByText('Je cherche un service').click()
  await expect(page).toHaveURL(/\/auth\?.*role=client/)
})

test('la recherche d’un client connecté mène aux résultats', async ({ page }) => {
  await signupViaApi(page, 'client')

  await gotoHydrated(page, '/')
  await page.getByLabel('Rechercher un service').first().fill('plomberie')
  await page.getByLabel('Rechercher un service').first().press('Enter')

  await expect(page).toHaveURL(/\/resultats\?.*q=plomberie/)
  await expect(page.getByText('Résultats pour')).toBeVisible()
})

test('un prestataire inscrit apparaît dans les résultats de recherche', async ({ page, browser }) => {
  // Le prestataire est créé dans un contexte séparé pour ne pas laisser sa
  // session active dans celui du chercheur.
  const providerContext = await browser.newContext()
  const providerPage = await providerContext.newPage()
  const provider = await createVisibleProvider(providerPage)
  await providerContext.close()

  await gotoHydrated(page, `/resultats?q=${encodeURIComponent(provider.displayName)}`)
  await expect(page.getByText(provider.displayName).first()).toBeVisible()
})

test('une recherche libre ne renvoie pas des prestataires d’un autre métier', async ({ page }) => {
  // « développeur web » est l'un des exemples proposés dans la barre de
  // recherche. Le terme ne correspondant à aucun nom de secteur, la page
  // retombait silencieusement sur « Ménage & Maison » et affichait des
  // prestataires de ménage sous le titre « Résultats pour développeur web ».
  await gotoHydrated(page, '/resultats?q=d%C3%A9veloppeur%20web')

  // Aucun profil ne correspond : mieux vaut le dire que de proposer autre chose.
  await expect(page.getByText('Aucun prestataire trouvé')).toBeVisible()
  await expect(page.getByText(/Repassage ·|Ménage à domicile ·/)).toHaveCount(0)
})

test('la recherche d’un sous-secteur ne renvoie que ce sous-secteur', async ({ page }) => {
  await gotoHydrated(page, '/resultats?q=Plomberie')

  // Ligne « sous-secteur · ville » de chaque carte de résultat.
  const lines = await page.getByText(/^[^·]+ · [^·]+$/).allTextContents()
  expect(lines.length, 'aucun résultat affiché pour « Plomberie »').toBeGreaterThan(0)
  expect(
    lines.every(line => line.trim().startsWith('Plomberie')),
    `sous-secteurs affichés : ${lines.join(' | ')}`,
  ).toBe(true)
})

test('la page d’une catégorie liste des prestataires', async ({ page }) => {
  await gotoHydrated(page, '/categories')
  await expect(page.getByRole('heading', { name: 'Toutes les catégories' })).toBeVisible()

  await page.getByRole('link', { name: /Artisanat & BTP/ }).first().click()
  await expect(page).toHaveURL(/\/categories\/btp/)
  await expect(page.getByRole('button', { name: 'Voir le profil' }).first()).toBeVisible()
})

test('publier une demande exige d’avoir vérifié son identité', async ({ page }) => {
  await signupViaApi(page, 'client')

  await gotoHydrated(page, '/demande')
  await page.getByLabel('Titre de la demande').fill('Fuite urgente cuisine')
  await page.getByLabel('Compétences recherchées, séparées par des virgules').fill('Plomberie')
  await page.getByLabel('Description de la demande').fill('Fuite sous l’évier depuis ce matin.')
  await page.getByLabel('Budget maximum en FCFA').fill('20000')
  await page.getByRole('button', { name: 'Immédiate' }).click()
  await page.getByLabel('Localisation').fill('Lomé')
  await page.getByRole('button', { name: 'Trouver un prestataire' }).click()

  await expect(page.getByText(/[Vv]érifi/)).toBeVisible()
})

test('publication d’une demande par un client vérifié', async ({ page }) => {
  await signupViaApi(page, 'client')
  await verifyIdentityViaApi(page)

  await gotoHydrated(page, '/demande')
  await page.getByLabel('Titre de la demande').fill('Fuite urgente cuisine')
  await page.getByLabel('Compétences recherchées, séparées par des virgules').fill('Plomberie')
  await page.getByLabel('Description de la demande').fill('Fuite sous l’évier depuis ce matin.')
  await page.getByLabel('Budget maximum en FCFA').fill('20000')
  await page.getByRole('button', { name: 'Immédiate' }).click()
  await page.getByLabel('Localisation').fill('Lomé')
  await page.getByRole('button', { name: 'Trouver un prestataire' }).click()

  await expect(page).toHaveURL(/\/matching\//)

  const response = await page.request.get('/api/requests')
  expect(response.ok()).toBeTruthy()
  expect((await response.json()).requests).toHaveLength(1)
})

test('espace client : tableau de bord, favoris et messages accessibles', async ({ page }) => {
  await signupViaApi(page, 'client')

  await gotoHydrated(page, '/dashboard/client')
  await expect(page.getByText(/Bonjour/)).toBeVisible()

  await gotoHydrated(page, '/favoris')
  await expect(page.getByText(/favoris/i).first()).toBeVisible()

  // Sur mobile, la coquille /messages n'affiche qu'un volet : la liste des
  // conversations (le panneau « Vos messages » est masqué) — on vérifie donc
  // la liste, présente dans les deux mises en page.
  await gotoHydrated(page, '/messages')
  await expect(page.getByPlaceholder('Rechercher une conversation')).toBeVisible()

  await gotoHydrated(page, '/profil')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('déconnexion depuis le compte', async ({ page }) => {
  await signupViaApi(page, 'client')
  await gotoHydrated(page, '/dashboard/client')

  const response = await page.request.delete('/api/auth/session')
  expect(response.ok()).toBeTruthy()

  await gotoHydrated(page, '/dashboard/client')
  await expect(page).toHaveURL(/\/auth(\?|$)/)
})
