import { expect, test, type Page } from '@playwright/test'

/**
 * Crée un compte réel (OTP + session + mot de passe) via l'API, en réutilisant
 * le contexte de la page : les cookies posés par le serveur (`wt_session`)
 * s'appliquent donc aux navigations qui suivent.
 *
 * On passe par l'API plutôt que par l'écran d'inscription pour les tests qui
 * veulent seulement *être* connectés — le parcours d'inscription lui-même est
 * couvert à travers l'interface dans auth.spec.ts.
 */
export const TEST_PASSWORD = 'MotDePasse1!'

/**
 * Saisit un code OTP dans le groupe de six cases.
 *
 * On tape au clavier plutôt que de remplir chaque case : le composant déplace
 * lui-même le focus vers la case suivante à chaque chiffre, exactement comme
 * pour un vrai utilisateur.
 */
export async function fillOtp(page: Page, code: string): Promise<void> {
  const firstBox = page.getByLabel('Chiffre 1')
  await expect(firstBox).toBeVisible()
  // `focus()` plutôt qu'un clic : les cases se trouvent juste sous l'en-tête
  // collant, qui intercepte le clic une fois l'élément amené à l'écran.
  await firstBox.focus()
  await page.keyboard.type(code, { delay: 60 })
}

/** Lit le code affiché par l'interface en mode développement. */
export async function readDevCode(page: Page): Promise<string> {
  const banner = page.getByText(/Mode développement — code\s*:\s*\d{6}/)
  await expect(banner).toBeVisible()
  const code = (await banner.textContent())?.match(/(\d{6})/)?.[1]
  if (!code) throw new Error('Code de développement introuvable dans l’encart OTP.')
  return code
}

let counter = 0

/**
 * Numéro togolais unique (8 chiffres) pour ne jamais réutiliser un compte.
 *
 * L'index du worker Playwright entre dans le numéro : sans lui, deux workers
 * lancés à la même milliseconde produisaient le même numéro, le second envoi
 * d'OTP écrasait le code du premier et un test échouait sur « Code invalide »
 * sans aucun rapport avec ce qu'il vérifiait.
 */
export function uniquePhone(): string {
  counter += 1
  const worker = test.info().workerIndex % 10
  return `9${worker}${String(Date.now()).slice(-5)}${String(counter % 10)}`
}

export interface TestUser {
  phone: string
  username: string
  password: string
  role: 'client' | 'prestataire'
  /** Nom affiché publiquement (fiche prestataire, messagerie) — unique par compte. */
  displayName: string
}

/**
 * Valide l'identité du compte connecté.
 *
 * Sans cette étape, un chercheur ne peut pas publier de demande et ne peut pas
 * contacter de prestataire (403 côté serveur). Les images attendues sont de
 * simples URL de données (voir verificationStore.isValidIdentityImage).
 */
const TINY_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='

/**
 * Recharge le portefeuille et attend la confirmation.
 *
 * Une demande n'est transmise au prestataire qu'une fois payée en séquestre
 * (#194) : sans solde, le parcours de messagerie s'arrête à l'écran de
 * paiement. Hors production, l'opérateur mobile money est simulé et confirme
 * la recharge au bout de ~3 s (voir server/api/wallet/recharge.post.ts).
 */
export async function rechargeWalletViaApi(page: Page, amount = 50_000): Promise<void> {
  const response = await page.request.post('/api/wallet/recharge', {
    data: { provider: 'tmoney', phone: '90000000', amount },
  })
  expect(response.ok(), `POST /api/wallet/recharge → ${response.status()} ${await response.text()}`).toBeTruthy()

  await expect
    .poll(async () => {
      const wallet = await page.request.get('/api/wallet/me')
      return wallet.ok() ? ((await wallet.json()).balance ?? 0) : 0
    }, { timeout: 20_000, message: 'la recharge simulée n’a jamais été confirmée' })
    .toBeGreaterThanOrEqual(amount)
}

export async function verifyIdentityViaApi(page: Page): Promise<void> {
  const response = await page.request.post('/api/verification', {
    data: { idCardImage: TINY_JPEG, passportPhotoImage: TINY_JPEG },
  })
  expect(response.ok(), `POST /api/verification → ${response.status()} ${await response.text()}`).toBeTruthy()
}

export async function signupViaApi(
  page: Page,
  role: 'client' | 'prestataire' = 'client',
): Promise<TestUser> {
  const phone = uniquePhone()
  const username = `e2e_${phone}`
  // Nom unique par compte : c'est lui qui s'affiche sur la fiche publique, et
  // les tests s'en servent pour retrouver *leur* prestataire parmi l'annuaire.
  const firstName = 'Test'
  const lastName = `E2E${phone}`

  const sent = await page.request.post('/api/auth/otp/send', {
    data: { method: 'phone', value: phone },
  })
  expect(sent.ok(), `POST /api/auth/otp/send → ${sent.status()}`).toBeTruthy()
  const { devCode } = (await sent.json()) as { devCode?: string }
  expect(
    devCode,
    "L'API ne renvoie pas `devCode` : l'instance de test croit avoir un provider SMS/email configuré.",
  ).toBeTruthy()

  const verified = await page.request.post('/api/auth/otp/verify', {
    data: { method: 'phone', value: phone, code: devCode },
  })
  expect(verified.ok(), `POST /api/auth/otp/verify → ${verified.status()} ${await verified.text()}`).toBeTruthy()

  const session = await page.request.post('/api/auth/session', {
    data: {
      method: 'phone',
      value: phone,
      role,
      username,
      firstName,
      lastName,
      location: 'Lomé',
    },
  })
  expect(session.ok(), `POST /api/auth/session → ${session.status()}`).toBeTruthy()

  const password = await page.request.post('/api/auth/password', {
    data: { password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD },
  })
  expect(password.ok(), `POST /api/auth/password → ${password.status()}`).toBeTruthy()

  return { phone, username, password: TEST_PASSWORD, role, displayName: `${firstName} ${lastName}` }
}
