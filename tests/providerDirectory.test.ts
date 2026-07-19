import { describe, expect, it } from 'vitest'
import { countBySector, getProviderById, getProviderDetail, resolveProviderRate, searchProviders } from '~~/server/utils/providerDirectory'
import { upsertProviderProfile } from '~~/server/utils/providerStore'

describe('searchProviders (#40 filtres de résultats)', () => {
  it('retourne tous les prestataires du secteur quand aucun autre filtre n’est actif', () => {
    const results = searchProviders({ sector: 'menage' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.sector === 'menage')).toBe(true)
  })

  it('combine sous-secteur et ville en ET logique', () => {
    const results = searchProviders({ sector: 'menage', subSectors: ['Ménage à domicile'], city: 'Lomé' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.subSector === 'Ménage à domicile' && p.city === 'Lomé')).toBe(true)
  })

  it('applique le filtre de note minimum', () => {
    const results = searchProviders({ sector: 'menage', ratingMin: 4.8 })
    expect(results.every((p) => p.rating >= 4.8)).toBe(true)
  })

  it('applique le filtre de prix maximum', () => {
    const results = searchProviders({ sector: 'menage', priceMax: 2000 })
    expect(results.every((p) => p.priceFrom <= 2000)).toBe(true)
  })

  it('retourne une liste vide quand aucun prestataire ne correspond (cas limite)', () => {
    const results = searchProviders({ sector: 'menage', subSectors: ['Repassage'], priceMax: 500 })
    expect(results).toEqual([])
  })

  it('filtre par texte libre sur le nom, le sous-secteur ou la ville', () => {
    const results = searchProviders({ query: 'Kpalimé' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.city === 'Kpalimé')).toBe(true)
  })
})

describe('countBySector (#66 grille /categories)', () => {
  it('compte les prestataires du secteur, cohérent avec searchProviders', () => {
    expect(countBySector('menage')).toBe(searchProviders({ sector: 'menage' }).length)
    expect(countBySector('menage')).toBeGreaterThan(0)
  })

  it('renvoie 0 pour un secteur sans prestataire dans l’annuaire de démo', () => {
    expect(countBySector('industrie')).toBe(0)
  })
})

describe('getProviderDetail — fenêtre « Voir le profil » (#127)', () => {
  it('renvoie null pour un id inconnu (cas limite)', () => {
    expect(getProviderDetail('inconnu', false)).toBeNull()
  })

  it('masque les coordonnées tant que le contact n’est pas engagé', () => {
    const detail = getProviderDetail('p01', false)
    expect(detail).not.toBeNull()
    expect(detail?.contactRevealed).toBe(false)
    expect(detail?.phone).toContain('••')
    expect(detail?.email).toContain('•')
  })

  it('démasque les coordonnées une fois le contact engagé', () => {
    const masked = getProviderDetail('p01', false)
    const revealed = getProviderDetail('p01', true)
    expect(revealed?.contactRevealed).toBe(true)
    expect(revealed?.phone).not.toContain('•')
    expect(revealed?.email).not.toContain('•')
    // Même prestataire, même source : uniquement le masquage doit différer.
    expect(revealed?.displayName).toBe(masked?.displayName)
  })

  it('dérive un nombre d’années d’expérience et un statut CV cohérents avec le badge vérifié', () => {
    const verified = getProviderDetail('p01', false) // Akofa M., vérifiée, 32 avis
    expect(verified?.experienceYears).toBeGreaterThanOrEqual(1)
    expect(verified?.cvUrl).not.toBeNull()

    const unverified = getProviderDetail('p04', false) // Yawa D., non vérifiée
    expect(unverified?.cvUrl).toBeNull()
  })
})

describe('searchProviders — un vrai compte prestataire apparaît dès son inscription (#43 → vrais comptes)', () => {
  it('un compte fraîchement créé (secteur + ville, sans profil professionnel complet) apparaît en recherche', () => {
    const before = searchProviders({ sector: 'digital' }).length

    upsertProviderProfile('real-provider-digital-1', {
      displayName: 'Nouveau Prestataire',
      sector: 'digital',
      city: 'Lomé',
      payoutMethod: 'flooz',
    })

    const results = searchProviders({ sector: 'digital' })
    expect(results.length).toBe(before + 1)

    const entry = results.find((p) => p.id === 'real-provider-digital-1')
    expect(entry).toMatchObject({
      displayName: 'Nouveau Prestataire',
      sector: 'digital',
      city: 'Lomé',
      verified: false,
      rating: 0,
      reviewCount: 0,
      priceFrom: 0,
      photoUrl: null,
    })
  })

  it('getProviderById retrouve aussi un vrai compte, pas seulement l’annuaire de démo', () => {
    upsertProviderProfile('real-provider-digital-2', { displayName: 'Autre Prestataire', sector: 'digital', city: 'Kara' })
    expect(getProviderById('real-provider-digital-2')?.displayName).toBe('Autre Prestataire')
  })
})

describe('resolveProviderRate — tarif fixe pour le paiement en séquestre (#194)', () => {
  it('renvoie le tarif de l’annuaire de démonstration en priorité', () => {
    expect(resolveProviderRate('p01')).toBe(3000)
  })

  it('retombe sur le tarif d’un vrai compte prestataire hors annuaire de démo', () => {
    upsertProviderProfile('real-provider-1', { displayName: 'Prestataire Test', sector: 'menage', rateFrom: 4200 })
    expect(resolveProviderRate('real-provider-1')).toBe(4200)
  })

  it('renvoie null quand aucun tarif n’est disponible', () => {
    expect(resolveProviderRate('provider-sans-tarif')).toBeNull()
  })
})
