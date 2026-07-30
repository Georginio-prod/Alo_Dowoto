import { expect, test } from '@playwright/test'
import { gotoForLayout, gotoHydrated } from './helpers/hydration'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fr = JSON.parse(readFileSync(fileURLToPath(new URL('../i18n/locales/fr.json', import.meta.url)), 'utf8'))
const en = JSON.parse(readFileSync(fileURLToPath(new URL('../i18n/locales/en.json', import.meta.url)), 'utf8'))

/**
 * L'application est bilingue (#364) : une clé oubliée dans une des deux langues
 * s'affiche telle quelle à l'écran (« header.searchSubmit »), ce qui passe
 * facilement inaperçu en développement puisqu'on lit toujours la même langue.
 */
function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  )
}

test('les deux dictionnaires exposent exactement les mêmes clés', () => {
  const frKeys = new Set(flatten(fr))
  const enKeys = new Set(flatten(en))

  const missingInEn = [...frKeys].filter(key => !enKeys.has(key))
  const missingInFr = [...enKeys].filter(key => !frKeys.has(key))

  expect(missingInEn, `clés absentes de en.json :\n  ${missingInEn.join('\n  ')}`).toEqual([])
  expect(missingInFr, `clés absentes de fr.json :\n  ${missingInFr.join('\n  ')}`).toEqual([])
})

const PAGES = ['/', '/categories', '/resultats', '/formules', '/faq', '/aide', '/contact', '/a-propos', '/auth']

/**
 * Une clé non résolue est rendue littéralement par vue-i18n : on cherche donc
 * des mots en `chemin.de.cle` dans le texte visible.
 */
const RAW_KEY_PATTERN = /\b[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*){1,4}\b/g
const ALLOWED = [/\.(com|tg|fr|org|net|io)\b/, /worktogo\./i, /\.\.\./]

for (const path of PAGES) {
  test(`aucune clé de traduction brute sur ${path}`, async ({ page }) => {
    await gotoForLayout(page, path)
    const text = await page.locator('main, body').first().innerText()
    const suspects = (text.match(RAW_KEY_PATTERN) ?? []).filter(
      candidate => !ALLOWED.some(allowed => allowed.test(candidate)),
    )
    expect(suspects, `clés brutes affichées sur ${path} : ${suspects.join(', ')}`).toEqual([])
  })
}

test('la version anglaise affiche bien de l’anglais', async ({ page }) => {
  await gotoHydrated(page, '/')
  await page.getByRole('button', { name: /English/ }).first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', /en/)

  // Quelques repères qui ne doivent plus être en français une fois basculé.
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Trouvez le bon prestataire')

  // La langue doit survivre à une navigation interne.
  await page.getByRole('link', { name: /Pricing|Plans/i }).first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', /en/)
})
