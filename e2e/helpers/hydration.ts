import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Attend que Nuxt ait hydraté l'application.
 *
 * Sans cette attente, un clic déclenché juste après `goto()` peut atteindre le
 * HTML rendu côté serveur avant que Vue n'y ait attaché ses écouteurs : le clic
 * « passe », mais rien ne se produit (un envoi de formulaire part alors en
 * navigation classique, un onglet ne bascule pas…).
 *
 * `app.mount()` — donc `__vue_app__` sur l'élément racine — ne suffit pas :
 * l'arbre est monté derrière un `<Suspense>` et l'hydratation se poursuit après.
 * Nuxt bascule `useNuxtApp().isHydrating` à `false` une fois celle-ci terminée,
 * ce qui est le vrai signal.
 */
export async function waitForHydration(page: Page, timeout?: number): Promise<void> {
  await page.waitForFunction(() => {
    const nuxt = (window as unknown as { useNuxtApp?: () => { isHydrating?: boolean } }).useNuxtApp
    if (typeof nuxt !== 'function') return false
    try {
      return nuxt().isHydrating === false
    } catch {
      return false
    }
  }, undefined, timeout ? { timeout } : undefined)
}

/** `goto` + attente d'hydratation, pour les tests qui cliquent aussitôt après. */
export async function gotoHydrated(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await waitForHydration(page)
}

/**
 * Variante pour les mesures de mise en page : on attend l'hydratation quand
 * elle arrive, mais on mesure quand même si elle tarde (serveur de dev chargé)
 * plutôt que de faire échouer le test sur un délai. Le rendu serveur suffit
 * dans l'immense majorité des cas pour détecter un débordement.
 */
export async function gotoForLayout(page: Page, path: string, timeout = 20_000): Promise<void> {
  await page.goto(path, { waitUntil: 'load' })
  try {
    await waitForHydration(page, timeout)
  } catch {
    // Hydratation trop lente : on mesure le rendu tel quel.
  }
}

/**
 * Clique jusqu'à ce que l'effet attendu soit visible.
 *
 * À réserver aux gestes *idempotents* (changer d'onglet, ouvrir un panneau) :
 * le clic peut être rejoué tant que la page n'est pas hydratée. Ne pas
 * l'utiliser pour un envoi de formulaire.
 */
export async function clickWhenReady(target: Locator, expected: Locator): Promise<void> {
  await expect(async () => {
    await target.click()
    await expect(expected).toBeVisible({ timeout: 1_500 })
  }).toPass({ timeout: 30_000 })
}
