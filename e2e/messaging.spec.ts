import { expect, test, type Browser, type Page } from '@playwright/test'
import { rechargeWalletViaApi, signupViaApi, verifyIdentityViaApi, type TestUser } from './helpers/auth'
import { createVisibleProvider } from './helpers/provider'
import { gotoHydrated } from './helpers/hydration'

/**
 * Parcours de mise en relation, cœur du produit : un chercheur trouve un
 * prestataire, ouvre sa fiche, le contacte, décrit son besoin, paie la
 * prestation en séquestre — seul moment où la demande est réellement
 * transmise (#194) — puis échange des messages avec lui.
 */
async function withProvider(browser: Browser): Promise<TestUser> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const provider = await createVisibleProvider(page)
  await context.close()
  return provider
}

/** Ouvre une session pour un compte déjà créé (OTP + mot de passe), via l'API. */
async function loginViaApi(page: Page, user: TestUser) {
  const sent = await page.request.post('/api/auth/otp/send', { data: { method: 'phone', value: user.phone } })
  const { devCode } = (await sent.json()) as { devCode?: string }
  await page.request.post('/api/auth/otp/verify', { data: { method: 'phone', value: user.phone, code: devCode } })
  const session = await page.request.post('/api/auth/session', {
    data: { method: 'phone', value: user.phone, password: user.password },
  })
  expect(session.ok(), `reconnexion → ${session.status()} ${await session.text()}`).toBeTruthy()
}

/**
 * Remplit le formulaire de première prise de contact, y compris les champs
 * additionnels propres au secteur du prestataire (#295) — ils sont
 * obligatoires et le bouton d'envoi reste inactif tant qu'ils sont vides.
 */
async function fillFirstContactForm(page: Page, need: string) {
  await expect(page.getByText(/Décrivez votre besoin/)).toBeVisible()
  await page.getByLabel('Votre besoin').fill(need)
  await page.getByPlaceholder('Téléphone ou email').fill('Via la messagerie WorkTogo')

  // Les champs par secteur portent tous un id préfixé (voir FirstContactForm).
  for (const select of await page.locator('select[id^="first-contact-sector-"]').all()) {
    const values = await select.locator('option').evaluateAll(options =>
      options.map(option => (option as HTMLOptionElement).value).filter(Boolean),
    )
    if (values[0]) await select.selectOption(values[0])
  }
  for (const input of await page.locator('input[id^="first-contact-sector-"]').all()) {
    if ((await input.inputValue()) === '') await input.fill('À préciser')
  }

  await page.getByRole('button', { name: 'Envoyer la demande' }).click()
}

/**
 * Carte d'un prestataire donné dans une liste de résultats.
 *
 * On part de son nom et on remonte au plus proche ancêtre contenant l'action
 * visée : filtrer des `div` par texte remonterait aussi les conteneurs de la
 * liste entière (le même nom apparaît en « mis en avant » et dans la liste).
 */
function providerCard(page: Page, displayName: string, actionLabel: string) {
  return page
    .getByText(displayName)
    .last()
    .locator(`xpath=ancestor::*[.//button[normalize-space()="${actionLabel}"] or .//button[@title="${actionLabel}"]][1]`)
}

/** Ouvre la fiche du prestataire *créé par le test* (et pas une fiche de démo). */
async function openProviderProfile(page: Page, provider: TestUser) {
  await gotoHydrated(page, `/resultats?q=${encodeURIComponent(provider.displayName)}`)
  const card = providerCard(page, provider.displayName, 'Voir le profil')
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Voir le profil' }).click()
  await expect(page.getByRole('button', { name: 'Contacter le prestataire' })).toBeVisible()
}

test('un chercheur non vérifié est invité à vérifier son identité avant de contacter', async ({ page, browser }) => {
  const provider = await withProvider(browser)
  await signupViaApi(page, 'client')

  await openProviderProfile(page, provider)
  await page.getByRole('button', { name: 'Contacter le prestataire' }).click()

  await expect(page.getByText(/Vérifiez votre identité/)).toBeVisible()
  await expect(page).not.toHaveURL(/\/messages\//)
})

test('mise en relation complète : contact, demande, paiement en séquestre et échange', async ({ page, browser }) => {
  // Deux comptes créés, une vérification d'identité, une recharge simulée puis
  // le parcours complet à l'écran : ce test est volontairement long.
  test.setTimeout(360_000)
  const provider = await withProvider(browser)
  await signupViaApi(page, 'client')
  await verifyIdentityViaApi(page)
  await rechargeWalletViaApi(page)

  await openProviderProfile(page, provider)
  await page.getByRole('button', { name: 'Contacter le prestataire' }).click()

  await expect(page).toHaveURL(/\/messages\//)
  await fillFirstContactForm(page, 'Fuite sous l’évier de la cuisine, intervention rapide souhaitée.')

  // La demande n'est transmise qu'une fois payée en séquestre.
  await page.getByRole('button', { name: /Payer et transmettre/ }).click()

  const composer = page.getByLabel('Votre message')
  await expect(composer).toBeVisible()
  await composer.fill('Bonjour, êtes-vous disponible demain matin ?')
  await page.getByRole('button', { name: 'Envoyer le message' }).click()
  // Le message apparaît deux fois : dans le fil et en aperçu dans la liste des
  // conversations — laquelle est masquée sur mobile. On vise donc le fil.
  const thread = page.getByRole('main')
  await expect(thread.getByText('Bonjour, êtes-vous disponible demain matin ?')).toBeVisible()

  // Côté prestataire : la conversation est visible et la réponse s'affiche.
  const providerContext = await browser.newContext()
  const providerPage = await providerContext.newPage()
  await loginViaApi(providerPage, provider)

  // On ouvre directement la conversation (son identifiant est dans l'URL du
  // chercheur) plutôt que de repasser par la liste : une navigation de moins,
  // et le test reste centré sur l'échange lui-même.
  const conversationPath = new URL(page.url()).pathname
  await gotoHydrated(providerPage, conversationPath)
  await expect(providerPage.getByRole('main').getByText('Bonjour, êtes-vous disponible demain matin ?')).toBeVisible()

  await providerPage.getByLabel('Votre message').fill('Bonjour, oui je suis disponible demain à 9h.')
  await providerPage.getByRole('button', { name: 'Envoyer le message' }).click()
  await expect(providerPage.getByRole('main').getByText('Bonjour, oui je suis disponible demain à 9h.')).toBeVisible()

  await providerContext.close()
})

test('un message contenant un numéro de téléphone est refusé', async ({ page, browser }) => {
  test.setTimeout(240_000)
  const provider = await withProvider(browser)
  await signupViaApi(page, 'client')
  await verifyIdentityViaApi(page)
  await rechargeWalletViaApi(page)

  await openProviderProfile(page, provider)
  await page.getByRole('button', { name: 'Contacter le prestataire' }).click()
  await fillFirstContactForm(page, 'Besoin d’un plombier pour une fuite.')
  await page.getByRole('button', { name: /Payer et transmettre/ }).click()

  const composer = page.getByLabel('Votre message')
  await expect(composer).toBeVisible()
  await composer.fill('Appelez-moi au 90 12 34 56 pour aller plus vite')
  await page.getByRole('button', { name: 'Envoyer le message' }).click()

  await expect(page.getByText(/interdit par les CGU|hors plateforme/i)).toBeVisible()
})

test('ajout et retrait d’un favori depuis les résultats', async ({ page, browser }) => {
  const provider = await withProvider(browser)
  await signupViaApi(page, 'client')

  await gotoHydrated(page, `/resultats?q=${encodeURIComponent(provider.displayName)}`)
  const card = providerCard(page, provider.displayName, 'Ajouter aux favoris')
  await card.getByTitle('Ajouter aux favoris').click()

  await expect(page.getByTitle('Retirer des favoris').first()).toBeVisible()
  await expect
    .poll(async () => {
      const response = await page.request.get('/api/favorites')
      return response.ok() ? ((await response.json()).favorites?.length ?? 0) : 0
    })
    .toBe(1)

  await gotoHydrated(page, '/favoris')
  await expect(page.getByText(provider.displayName).first()).toBeVisible()

  await page.getByTitle('Retirer des favoris').first().click()
  await expect(page.getByText(/Aucun favori/)).toBeVisible()
})
