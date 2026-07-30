import type { Page } from '@playwright/test'

/**
 * Bruit connu, non représentatif d'un bug de l'application :
 *  - Nuxt DevTools (chargé en dev uniquement) et ses avertissements
 *    d'hydratation, qui viennent de son propre overlay et non des pages.
 *  - favicon absent, requêtes annulées par une navigation.
 */
const IGNORED = [
  /devtools/i,
  /Hydration completed but contains mismatches/i,
  /favicon/i,
  /net::ERR_ABORTED/i,
  /ResizeObserver loop/i,
]

export interface PageErrors {
  /** Erreurs console + exceptions non capturées observées depuis l'appel. */
  messages: string[]
}

export function collectPageErrors(page: Page): PageErrors {
  const messages: string[] = []
  const push = (message: string) => {
    if (!IGNORED.some(pattern => pattern.test(message))) messages.push(message)
  }

  page.on('console', (message) => {
    if (message.type() === 'error') push(`[console] ${message.text()}`)
  })
  page.on('pageerror', error => push(`[pageerror] ${error.message}`))

  return { messages }
}
