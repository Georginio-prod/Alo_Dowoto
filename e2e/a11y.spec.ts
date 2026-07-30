import { expect, test, type Page } from '@playwright/test'
import { gotoForLayout } from './helpers/hydration'
import { signupViaApi } from './helpers/auth'

/**
 * Contrôles d'accessibilité mécaniques, ceux qu'aucune relecture humaine ne
 * rattrape de façon fiable : une image sans alternative textuelle, un bouton
 * dont le lecteur d'écran ne peut rien annoncer, un champ sans étiquette, deux
 * éléments portant le même `id`.
 *
 * Volontairement limité à ce qui est objectif et vérifiable sans jugement de
 * valeur — pas de contraste ni d'ordre de lecture ici.
 */
interface A11yIssues {
  imagesWithoutAlt: string[]
  controlsWithoutName: string[]
  fieldsWithoutLabel: string[]
  duplicateIds: string[]
}

async function auditPage(page: Page): Promise<A11yIssues> {
  return page.evaluate(() => {
    const describe = (el: Element) => {
      const attrs = ['id', 'name', 'placeholder', 'type', 'href', 'src']
        .map(attribute => (el.getAttribute(attribute) ? `${attribute}="${el.getAttribute(attribute)}"` : ''))
        .filter(Boolean)
        .join(' ')
      return `<${el.tagName.toLowerCase()} ${attrs}>`.replace(/\s+>/, '>')
    }

    const isVisible = (el: Element) => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }

    const accessibleName = (el: Element) => (
      el.getAttribute('aria-label')?.trim()
      || (() => {
        const labelledBy = el.getAttribute('aria-labelledby')
        return labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : ''
      })()
      || (el as HTMLElement).innerText?.trim()
      || el.getAttribute('title')?.trim()
      || ''
    )

    const imagesWithoutAlt = Array.from(document.querySelectorAll('img'))
      .filter(img => isVisible(img) && img.getAttribute('alt') === null)
      .map(describe)

    const controlsWithoutName = Array.from(document.querySelectorAll('button, a[href]'))
      .filter(el => isVisible(el) && !accessibleName(el))
      .map(describe)

    const fieldsWithoutLabel = Array.from(document.querySelectorAll('input, select, textarea'))
      .filter((el) => {
        if (!isVisible(el)) return false
        if ((el as HTMLInputElement).type === 'hidden') return false
        if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false
        const id = el.getAttribute('id')
        if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return false
        return !el.closest('label')
      })
      .map(describe)

    const seen = new Set<string>()
    const duplicateIds: string[] = []
    for (const el of Array.from(document.querySelectorAll('[id]'))) {
      const id = el.getAttribute('id') ?? ''
      if (!id) continue
      if (seen.has(id)) duplicateIds.push(id)
      else seen.add(id)
    }

    return { imagesWithoutAlt, controlsWithoutName, fieldsWithoutLabel, duplicateIds }
  })
}

function formatIssues(path: string, issues: A11yIssues): string {
  const lines: string[] = []
  if (issues.imagesWithoutAlt.length) lines.push(`images sans alt : ${issues.imagesWithoutAlt.join(', ')}`)
  if (issues.controlsWithoutName.length) lines.push(`boutons/liens sans intitulé : ${issues.controlsWithoutName.join(', ')}`)
  if (issues.fieldsWithoutLabel.length) lines.push(`champs sans étiquette : ${issues.fieldsWithoutLabel.join(', ')}`)
  if (issues.duplicateIds.length) lines.push(`identifiants dupliqués : ${issues.duplicateIds.join(', ')}`)
  return `${path} :\n  ${lines.join('\n  ')}`
}

function isClean(issues: A11yIssues): boolean {
  return Object.values(issues).every(list => list.length === 0)
}

const PUBLIC_PAGES = [
  '/', '/categories', '/categories/btp', '/resultats', '/demande', '/formules',
  '/aide', '/faq', '/contact', '/a-propos', '/reclamation', '/cgu', '/auth',
]

for (const path of PUBLIC_PAGES) {
  test(`accessibilité mécanique de ${path}`, async ({ page }) => {
    await gotoForLayout(page, path)
    const issues = await auditPage(page)
    expect(isClean(issues), formatIssues(path, issues)).toBe(true)
  })
}

test('accessibilité mécanique de l’espace chercheur', async ({ page }) => {
  test.setTimeout(180_000)
  await signupViaApi(page, 'client')

  for (const path of ['/dashboard/client', '/favoris', '/profil', '/solde', '/messages']) {
    await gotoForLayout(page, path)
    const issues = await auditPage(page)
    expect(isClean(issues), formatIssues(path, issues)).toBe(true)
  }
})
