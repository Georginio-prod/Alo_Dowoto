import { describe, expect, it } from 'vitest'
import { getProviderProfile, upsertProviderProfile } from '~~/server/utils/providerStore'

describe('providerStore — localisation & mode de rémunération (#123)', () => {
  it('sauvegarde le mode de rémunération sélectionné (correction du bug #123)', () => {
    const profile = upsertProviderProfile('provider-1', { sector: 'menage', payoutMethod: 'flooz' })
    expect(profile.payoutMethod).toBe('flooz')
    expect(getProviderProfile('provider-1')?.payoutMethod).toBe('flooz')
  })

  it('conserve la ville et le mode de rémunération déjà enregistrés lors d\'une mise à jour partielle', () => {
    upsertProviderProfile('provider-2', { sector: 'menage', city: 'Lomé', payoutMethod: 'tmoney' })
    const updated = upsertProviderProfile('provider-2', { sector: 'menage', description: 'Ménage à domicile' })

    expect(updated.city).toBe('Lomé')
    expect(updated.payoutMethod).toBe('tmoney')
    expect(updated.description).toBe('Ménage à domicile')
  })
})
