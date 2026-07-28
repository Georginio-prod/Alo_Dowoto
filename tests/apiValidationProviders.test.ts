import { describe, expect, it } from 'vitest'
import { addAvailabilitySchema, patchProviderSchema } from '~~/server/utils/apiValidationProviders'

/** Retourne le premier message d'erreur d'un parse échoué (ou null si succès). */
function firstError(schema: { safeParse: (input: unknown) => { success: boolean, error?: { issues: { message: string }[] } } }, input: unknown): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : (result.error?.issues[0]?.message ?? '')
}

describe('addAvailabilitySchema (#290, validation POST /api/providers/availability)', () => {
  it('accepte des dates non vides (le format/ordre exact reste vérifié par addUnavailabilityPeriod)', () => {
    expect(addAvailabilitySchema.safeParse({ startDate: '2026-08-01', endDate: '2026-08-10' }).success).toBe(true)
  })

  it('rejette une date de début ou de fin absente/vide', () => {
    const msg = 'Les dates de début et de fin sont requises.'
    expect(firstError(addAvailabilitySchema, { endDate: '2026-08-10' })).toBe(msg)
    expect(firstError(addAvailabilitySchema, { startDate: '   ', endDate: '2026-08-10' })).toBe(msg)
  })
})

describe('patchProviderSchema (validation PATCH /api/providers/me)', () => {
  function validBody() {
    return {
      sector: 'menage',
      city: 'Lomé',
      payoutMethod: 'flooz',
      rateFrom: 2000,
      rateTo: 5000,
      mobility: 'les_deux',
      latitude: 6.13,
      longitude: 1.22,
      languages: [' Français ', 'Ewe'],
      formations: [{ title: 'CAP', institution: 'CFA Lomé', year: '2020' }],
      certifications: [{ id: 'c1', title: 'Certif plomberie', fileUrl: '/f.pdf', fileName: 'f.pdf', status: 'en_attente' }],
    }
  }

  it('accepte un corps complet valide et trim les langues', () => {
    const result = patchProviderSchema.safeParse(validBody())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.languages).toEqual(['Français', 'Ewe'])
  })

  it('accepte un corps vide (tous les champs sont optionnels — le secteur hérite du profil existant côté handler)', () => {
    expect(patchProviderSchema.safeParse({}).success).toBe(true)
  })

  it('rejette un secteur hors de la liste connue', () => {
    expect(firstError(patchProviderSchema, { sector: 'astronomie' })).toBe('Secteur invalide.')
  })

  it('rejette un mode de rémunération invalide', () => {
    expect(firstError(patchProviderSchema, { payoutMethod: 'cheque' })).toBe('Le mode de rémunération WorkTogo est obligatoire.')
  })

  it('rejette un tarif négatif ou non numérique', () => {
    expect(firstError(patchProviderSchema, { rateFrom: -1 })).toBe('Tarif invalide.')
    expect(firstError(patchProviderSchema, { rateTo: 'beaucoup' })).toBe('Tarif invalide.')
  })

  it('rejette un tarif maximum inférieur au tarif minimum', () => {
    expect(firstError(patchProviderSchema, { rateFrom: 5000, rateTo: 2000 })).toBe('Le tarif maximum doit être supérieur ou égal au tarif minimum.')
  })

  it('rejette une préférence de déplacement invalide', () => {
    expect(firstError(patchProviderSchema, { mobility: 'teleportation' })).toBe('Préférence de déplacement invalide.')
  })

  it('rejette des coordonnées GPS partielles ou hors plage', () => {
    expect(firstError(patchProviderSchema, { latitude: 200 })).toBe('Coordonnées GPS invalides.')
    expect(firstError(patchProviderSchema, { latitude: 6.13 })).toBe('Coordonnées GPS invalides.')
  })

  it('rejette une liste de langues trop longue ou contenant une entrée vide', () => {
    expect(firstError(patchProviderSchema, { languages: Array.from({ length: 13 }, (_, i) => `lang${i}`) })).toBe('Liste de langues invalide.')
    expect(firstError(patchProviderSchema, { languages: ['   '] })).toBe('Liste de langues invalide.')
  })

  it('rejette une formation sans titre', () => {
    expect(firstError(patchProviderSchema, { formations: [{ title: '  ', institution: 'CFA', year: '2020' }] })).toBe('Liste de formations invalide.')
  })

  it('rejette une certification sans fileUrl', () => {
    expect(firstError(patchProviderSchema, { certifications: [{ id: 'c1', title: 'Certif', fileUrl: '', fileName: 'f.pdf', status: 'en_attente' }] })).toBe('Liste de certifications invalide.')
  })
})

describe('patchProviderSchema — champs géolocalisation (#geoloc)', () => {
  it('accepte un quartier valide de la Région Maritime', () => {
    expect(patchProviderSchema.safeParse({ quartier: 'be' }).success).toBe(true)
  })

  it('rejette un quartier inconnu', () => {
    expect(firstError(patchProviderSchema, { quartier: 'quartier-inexistant' })).toBe('Quartier invalide.')
  })

  it('accepte adresse et points de repère en texte libre', () => {
    const result = patchProviderSchema.safeParse({ adresse: 'Non renseignée', pointsDeRepere: 'Près du grand marché' })
    expect(result.success).toBe(true)
  })

  it('rejette un rayon d’intervention négatif, nul ou hors plage', () => {
    expect(firstError(patchProviderSchema, { rayonInterventionKm: 0 })).toBe("Rayon d'intervention invalide.")
    expect(firstError(patchProviderSchema, { rayonInterventionKm: -5 })).toBe("Rayon d'intervention invalide.")
    expect(firstError(patchProviderSchema, { rayonInterventionKm: 500 })).toBe("Rayon d'intervention invalide.")
  })

  it('accepte un rayon d’intervention dans la plage valide', () => {
    expect(patchProviderSchema.safeParse({ rayonInterventionKm: 15 }).success).toBe(true)
  })

  it('accepte le réglage de position approximative', () => {
    expect(patchProviderSchema.safeParse({ positionApproximative: false }).success).toBe(true)
  })
})
