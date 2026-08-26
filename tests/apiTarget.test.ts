import { describe, expect, it } from 'vitest'
import { isMigratedPath, parseMigratedPrefixes, resolveApiBase } from '~~/app/utils/apiTarget'

/**
 * Le point de bascule est la pièce la plus sensible du découplage sur un site
 * en ligne : ces tests verrouillent le fait que, par défaut, TOUT reste sur
 * Nitro (aucun changement), et que seule une bascule explicite route vers le
 * backend — au bon domaine, sans faux positif de préfixe.
 */
describe('resolveApiBase — point de bascule Nitro ↔ backend', () => {
  const BACKEND = 'https://api.example.com'

  it('sans backend configuré → API Nitro (relatif), même si un préfixe est listé', () => {
    expect(resolveApiBase('/api/auth/session', '', [])).toBe('')
    expect(resolveApiBase('/api/wallet/me', '', ['/api/wallet'])).toBe('')
  })

  it('backend configuré mais domaine NON migré → reste sur Nitro', () => {
    expect(resolveApiBase('/api/auth/session', BACKEND, ['/api/wallet'])).toBe('')
  })

  it('backend configuré + domaine migré → bascule vers le backend', () => {
    expect(resolveApiBase('/api/wallet/me', BACKEND, ['/api/wallet'])).toBe(BACKEND)
  })

  it('normalise le slash final de l’URL du backend', () => {
    expect(resolveApiBase('/api/wallet/me', `${BACKEND}/`, ['/api/wallet'])).toBe(BACKEND)
  })
})

describe('isMigratedPath — correspondance à la frontière de segment', () => {
  it('capte le préfixe exact et ses sous-chemins', () => {
    expect(isMigratedPath('/api/wallet', ['/api/wallet'])).toBe(true)
    expect(isMigratedPath('/api/wallet/me', ['/api/wallet'])).toBe(true)
  })

  it('ne capte pas un préfixe voisin (pas de faux positif)', () => {
    expect(isMigratedPath('/api/wallet-export', ['/api/wallet'])).toBe(false)
  })

  it('tolère un slash final dans le préfixe configuré', () => {
    expect(isMigratedPath('/api/wallet/me', ['/api/wallet/'])).toBe(true)
  })
})

describe('parseMigratedPrefixes — lecture de la liste CSV', () => {
  it('nettoie espaces et entrées vides', () => {
    expect(parseMigratedPrefixes(' /api/wallet, /api/auth ,, ')).toEqual(['/api/wallet', '/api/auth'])
  })

  it('renvoie un tableau vide pour une entrée vide ou absente', () => {
    expect(parseMigratedPrefixes('')).toEqual([])
    expect(parseMigratedPrefixes(null)).toEqual([])
    expect(parseMigratedPrefixes(undefined)).toEqual([])
  })
})
