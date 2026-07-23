import { describe, expect, it } from 'vitest'
import { addNonceToScripts } from '~~/server/plugins/cspNonce'

/**
 * Cette fonction est le cœur du contournement du problème découvert en
 * testant la CSP (#354) en build de production : Nuxt injecte lui-même un
 * script inline (`window.__NUXT__.config = ...`) dont le contenu varie par
 * requête — impossible à couvrir par un hash statique, d'où le choix d'un
 * nonce posé sur toutes les balises <script> du HTML rendu.
 */
describe('addNonceToScripts (#354)', () => {
  it('ajoute le nonce à une balise <script> sans attribut', () => {
    const html = '<script>alert(1)</script>'
    expect(addNonceToScripts(html, 'abc123')).toBe('<script nonce="abc123">alert(1)</script>')
  })

  it('ajoute le nonce à une balise <script> avec des attributs existants', () => {
    const html = '<script type="module" src="/_nuxt/entry.js"></script>'
    expect(addNonceToScripts(html, 'abc123')).toBe('<script nonce="abc123" type="module" src="/_nuxt/entry.js"></script>')
  })

  it('ne double pas le nonce sur une balise qui en a déjà un', () => {
    const html = '<script nonce="deja-present">alert(1)</script>'
    expect(addNonceToScripts(html, 'abc123')).toBe(html)
  })

  it('traite plusieurs balises <script> dans le même fragment', () => {
    const html = '<script>a()</script><link rel="stylesheet"><script>b()</script>'
    const result = addNonceToScripts(html, 'xyz')
    expect(result).toBe('<script nonce="xyz">a()</script><link rel="stylesheet"><script nonce="xyz">b()</script>')
  })

  it('laisse intact un fragment sans balise <script>', () => {
    const html = '<link rel="preload" href="/_nuxt/app.css">'
    expect(addNonceToScripts(html, 'abc123')).toBe(html)
  })
})
