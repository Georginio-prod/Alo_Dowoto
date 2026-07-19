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
