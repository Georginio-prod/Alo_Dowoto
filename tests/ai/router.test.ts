import { describe, expect, it } from 'vitest'
import { pickModelTier } from '~~/server/utils/ai/router'

/**
 * Routage économique (#geoloc, 2.3) : léger par défaut, escalade seulement
 * sur un signal clair de demande de recommandation — décision déterministe,
 * sans appel au modèle, pour maîtriser les coûts.
 */
describe('pickModelTier', () => {
  it('reste léger pour une question de navigation/FAQ', () => {
    expect(pickModelTier('Comment fonctionne le paiement de mon abonnement ?')).toBe('light')
  })

  it('reste léger pour un message vide', () => {
    expect(pickModelTier('')).toBe('light')
    expect(pickModelTier('   ')).toBe('light')
  })

  it('escalade pour une demande de recommandation explicite', () => {
    expect(pickModelTier('Je cherche un plombier près de chez moi')).toBe('heavy')
  })

  it('escalade sur un métier même sans verbe de recherche explicite', () => {
    expect(pickModelTier('Qui peut réparer ma climatisation aujourd’hui ?')).toBe('heavy')
  })

  it('n’est pas sensible à la casse', () => {
    expect(pickModelTier('TROUVE-MOI UN PHOTOGRAPHE PAS CHER')).toBe('heavy')
  })
})
