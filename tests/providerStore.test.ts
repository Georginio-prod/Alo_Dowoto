import { describe, expect, it } from 'vitest'
import { getProviderProfile, resolveRequiredOnboardingFields, upsertProviderProfile } from '~~/server/utils/providerStore'

describe('providerStore — localisation & mode de rémunération (#123)', () => {
  it('sauvegarde le mode de rémunération sélectionné (correction du bug #123)', () => {
    const profile = upsertProviderProfile('provider-1', { displayName: 'Prestataire 1', sector: 'menage', payoutMethod: 'flooz' })
    expect(profile.payoutMethod).toBe('flooz')
    expect(getProviderProfile('provider-1')?.payoutMethod).toBe('flooz')
  })

  it('conserve la ville et le mode de rémunération déjà enregistrés lors d\'une mise à jour partielle', () => {
    upsertProviderProfile('provider-2', { displayName: 'Prestataire 2', sector: 'menage', city: 'Lomé', payoutMethod: 'tmoney' })
    const updated = upsertProviderProfile('provider-2', { displayName: 'Prestataire 2', sector: 'menage', description: 'Ménage à domicile' })

    expect(updated.city).toBe('Lomé')
    expect(updated.payoutMethod).toBe('tmoney')
    expect(updated.description).toBe('Ménage à domicile')
  })
})

describe('providerStore — champs géolocalisation (#geoloc)', () => {
  it('active la position approximative par défaut, sans que le prestataire n\'ait rien renseigné', () => {
    const profile = upsertProviderProfile('provider-geo-default', { displayName: 'Prestataire', sector: 'menage' })
    expect(profile.positionApproximative).toBe(true)
  })

  it('enregistre quartier, points de repère et rayon d\'intervention', () => {
    const profile = upsertProviderProfile('provider-geo-1', {
      displayName: 'Prestataire Géo',
      sector: 'btp',
      quartier: 'be',
      adresse: 'Non renseignée',
      pointsDeRepere: 'Près du grand marché',
      rayonInterventionKm: 8,
    })

    expect(profile.quartier).toBe('be')
    expect(profile.pointsDeRepere).toBe('Près du grand marché')
    expect(profile.rayonInterventionKm).toBe(8)
  })

  it('conserve un opt-out explicite de la position approximative lors d\'une mise à jour partielle ultérieure', () => {
    upsertProviderProfile('provider-geo-2', { displayName: 'Prestataire Visible', sector: 'commerce', positionApproximative: false })
    const updated = upsertProviderProfile('provider-geo-2', { displayName: 'Prestataire Visible', sector: 'commerce', description: 'Boutique physique' })

    expect(updated.positionApproximative).toBe(false)
  })
})

describe('resolveRequiredOnboardingFields — obligatoire côté serveur (#124)', () => {
  it('rejette une inscription sans localisation ni mode de rémunération', () => {
    expect(resolveRequiredOnboardingFields({}, null)).toEqual({
      ok: false,
      error: 'La localisation est obligatoire.',
    })
  })

  it('rejette une localisation vide (cas limite : espaces uniquement)', () => {
    expect(resolveRequiredOnboardingFields({ city: '   ', payoutMethod: 'flooz' }, null)).toEqual({
      ok: false,
      error: 'La localisation est obligatoire.',
    })
  })

  it('rejette un mode de rémunération manquant', () => {
    expect(resolveRequiredOnboardingFields({ city: 'Lomé' }, null)).toEqual({
      ok: false,
      error: 'Le mode de rémunération WorkTogo est obligatoire.',
    })
  })

  it('accepte quand les deux champs sont renseignés', () => {
    expect(resolveRequiredOnboardingFields({ city: 'Lomé', payoutMethod: 'flooz' }, null)).toEqual({
      ok: true,
      city: 'Lomé',
      payoutMethod: 'flooz',
    })
  })

  it('retombe sur le profil déjà enregistré pour une mise à jour partielle', () => {
    const existing = upsertProviderProfile('provider-3', { displayName: 'Prestataire 3', sector: 'menage', city: 'Kara', payoutMethod: 'virement' })
    expect(resolveRequiredOnboardingFields({}, existing)).toEqual({
      ok: true,
      city: 'Kara',
      payoutMethod: 'virement',
    })
  })
})
