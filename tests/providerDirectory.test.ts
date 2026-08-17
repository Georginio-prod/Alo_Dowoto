import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { countBySector, getProviderById, getProviderDetail, resolveProviderRate, searchProviders } from '~~/server/utils/providerDirectory'
import { addUnavailabilityPeriod } from '~~/server/utils/providerAvailabilityStore'
import { upsertProviderProfile } from '~~/server/utils/providerStore'
import { submitReview } from '~~/server/utils/reviewStore'

describe('searchProviders (#40 filtres de résultats)', async () => {
  it('retourne tous les prestataires du secteur quand aucun autre filtre n’est actif', async () => {
    const results = await searchProviders({ sector: 'menage' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.sector === 'menage')).toBe(true)
  })

  it('combine sous-secteur et ville en ET logique', async () => {
    const results = await searchProviders({ sector: 'menage', subSectors: ['Ménage à domicile'], city: 'Lomé' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.subSector === 'Ménage à domicile' && p.city === 'Lomé')).toBe(true)
  })

  it('applique le filtre de note minimum', async () => {
    const results = await searchProviders({ sector: 'menage', ratingMin: 4.8 })
    expect(results.every((p) => p.rating >= 4.8)).toBe(true)
  })

  it('applique le filtre de prix maximum', async () => {
    const results = await searchProviders({ sector: 'menage', priceMax: 2000 })
    expect(results.every((p) => p.priceFrom <= 2000)).toBe(true)
  })

  it('retourne une liste vide quand aucun prestataire ne correspond (cas limite)', async () => {
    const results = await searchProviders({ sector: 'menage', subSectors: ['Repassage'], priceMax: 500 })
    expect(results).toEqual([])
  })

  it('filtre par texte libre sur le nom, le sous-secteur ou la ville', async () => {
    const results = await searchProviders({ query: 'Kpalimé' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.city === 'Kpalimé')).toBe(true)
  })
})

describe('searchProviders — tri multi-critères plutôt que par ordre d’insertion (#288)', async () => {
  it('classe un prestataire mieux noté, plus avisé et vérifié avant un profil moins bien noté', async () => {
    // p03 (Essolakina T., vérifiée, note 4.9, 54 avis) doit devancer p06
    // (Adjoa K., non vérifiée, note 4.5, 12 avis) — l'inverse de leur ordre
    // d'apparition dans l'annuaire de démo (p03 avant p06 dans DIRECTORY,
    // ce test vérifie donc un vrai tri, pas juste la préservation de l'ordre).
    const results = await searchProviders({ sector: 'menage', city: 'Lomé' })
    const best = results.findIndex((p) => p.id === 'p03')
    const worst = results.findIndex((p) => p.id === 'p06')
    expect(best).toBeGreaterThanOrEqual(0)
    expect(worst).toBeGreaterThanOrEqual(0)
    expect(best).toBeLessThan(worst)
  })

  it('classe un compte réel bien noté avant un compte réel sans aucun avis', async () => {
    await upsertProviderProfile('real-provider-score-high', { displayName: 'Bien noté', sector: 'beaute', city: 'Lomé' })
    await upsertProviderProfile('real-provider-score-low', { displayName: 'Sans avis', sector: 'beaute', city: 'Lomé' })

    for (let i = 0; i < 10; i++) {
      submitReview(`conv-score-${i}`, `author-${i}`, 'real-provider-score-high', 5)
    }

    const results = await searchProviders({ sector: 'beaute', city: 'Lomé' })
    const high = results.findIndex((p) => p.id === 'real-provider-score-high')
    const low = results.findIndex((p) => p.id === 'real-provider-score-low')
    expect(high).toBeGreaterThanOrEqual(0)
    expect(low).toBeGreaterThanOrEqual(0)
    expect(high).toBeLessThan(low)
  })
})

describe('searchProviders — tri explicite de la barre de résultats', async () => {
  it('trie par prix croissant', async () => {
    const prices = (await searchProviders({ sector: 'menage', sort: 'prix_asc' })).map((p) => p.priceFrom)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('trie par prix décroissant', async () => {
    const prices = (await searchProviders({ sector: 'menage', sort: 'prix_desc' })).map((p) => p.priceFrom)
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
  })

  it('trie par note décroissante', async () => {
    const ratings = (await searchProviders({ sector: 'menage', sort: 'note' })).map((p) => p.rating)
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a))
  })

  it('le tri explicite prime sur le tri par proximité (coordonnées fournies)', async () => {
    const prices = (await searchProviders({ sector: 'menage', latitude: 6.13, longitude: 1.22, sort: 'prix_asc' })).map((p) => p.priceFrom)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })
})

describe('searchProviders — distance réelle (#263)', async () => {
  it('renvoie distanceKm à null pour tous les résultats sans coordonnées du chercheur', async () => {
    const results = await searchProviders({ sector: 'menage' })
    expect(results.every((p) => p.distanceKm === null)).toBe(true)
  })

  it('calcule la distance et trie par proximité quand le chercheur a des coordonnées et le prestataire aussi', async () => {
    await upsertProviderProfile('real-provider-geo-near', {
      displayName: 'Proche',
      sector: 'digital',
      city: 'Lomé',
      latitude: 6.14,
      longitude: 1.23,
    })
    await upsertProviderProfile('real-provider-geo-far', {
      displayName: 'Loin',
      sector: 'digital',
      city: 'Kara',
      latitude: 9.5511,
      longitude: 1.1861,
    })

    // Coordonnées du chercheur très proches du prestataire "Proche".
    const results = await searchProviders({ sector: 'digital', latitude: 6.1319, longitude: 1.2228 })
    const near = results.find((p) => p.id === 'real-provider-geo-near')
    const far = results.find((p) => p.id === 'real-provider-geo-far')

    expect(near).toBeDefined()
    expect(far).toBeDefined()
    expect(near?.distanceKm).not.toBeNull()
    expect(far?.distanceKm).not.toBeNull()
    expect(near?.distanceKm ?? Infinity).toBeLessThan(far?.distanceKm ?? Infinity)
    // Trié par proximité : "Proche" doit apparaître avant "Loin".
    if (near && far) {
      expect(results.indexOf(near)).toBeLessThan(results.indexOf(far))
    }
  })

  it('garde distanceKm à null pour un prestataire sans coordonnées, même si le chercheur en a', async () => {
    await upsertProviderProfile('real-provider-geo-no-coords', { displayName: 'Sans coordonnées', sector: 'digital', city: 'Lomé' })

    const results = await searchProviders({ sector: 'digital', latitude: 6.1319, longitude: 1.2228 })
    const entry = results.find((p) => p.id === 'real-provider-geo-no-coords')
    expect(entry?.distanceKm).toBeNull()
  })

  it('filtre par rayon (radiusKm) en excluant les prestataires trop éloignés, sans exclure ceux sans coordonnées', async () => {
    await upsertProviderProfile('real-provider-geo-radius-near', {
      displayName: 'Dans le rayon',
      sector: 'evenement',
      city: 'Lomé',
      latitude: 6.135,
      longitude: 1.225,
    })
    await upsertProviderProfile('real-provider-geo-radius-far', {
      displayName: 'Hors rayon',
      sector: 'evenement',
      city: 'Kara',
      latitude: 9.5511,
      longitude: 1.1861,
    })

    const results = await searchProviders({ sector: 'evenement', latitude: 6.1319, longitude: 1.2228, radiusKm: 10 })

    expect(results.some((p) => p.id === 'real-provider-geo-radius-near')).toBe(true)
    expect(results.some((p) => p.id === 'real-provider-geo-radius-far')).toBe(false)
  })
})

describe('countBySector (#66 grille /categories)', async () => {
  it('compte les prestataires du secteur, cohérent avec searchProviders', async () => {
    expect(await countBySector('menage')).toBe((await searchProviders({ sector: 'menage' })).length)
    expect(await countBySector('menage')).toBeGreaterThan(0)
  })

  it('renvoie 0 pour un secteur sans prestataire dans l’annuaire de démo', async () => {
    expect(await countBySector('industrie')).toBe(0)
  })
})

describe('getProviderDetail — fenêtre « Voir le profil » (#127)', async () => {
  it('renvoie null pour un id inconnu (cas limite)', async () => {
    expect(await getProviderDetail('inconnu', false)).toBeNull()
  })

  it('masque les coordonnées tant que le contact n’est pas engagé', async () => {
    const detail = await getProviderDetail('p01', false)
    expect(detail).not.toBeNull()
    expect(detail?.contactRevealed).toBe(false)
    expect(detail?.phone).toContain('••')
    expect(detail?.email).toContain('•')
  })

  it('démasque les coordonnées une fois le contact engagé', async () => {
    const masked = await getProviderDetail('p01', false)
    const revealed = await getProviderDetail('p01', true)
    expect(revealed?.contactRevealed).toBe(true)
    expect(revealed?.phone).not.toContain('•')
    expect(revealed?.email).not.toContain('•')
    // Même prestataire, même source : uniquement le masquage doit différer.
    expect(revealed?.displayName).toBe(masked?.displayName)
  })

  it('dérive un nombre d’années d’expérience et un statut CV cohérents avec le badge vérifié', async () => {
    const verified = await getProviderDetail('p01', false) // Akofa M., vérifiée, 32 avis
    expect(verified?.experienceYears).toBeGreaterThanOrEqual(1)
    expect(verified?.cvUrl).not.toBeNull()

    const unverified = await getProviderDetail('p04', false) // Yawa D., non vérifiée
    expect(unverified?.cvUrl).toBeNull()
  })
})

describe('searchProviders — un vrai compte prestataire apparaît dès son inscription (#43 → vrais comptes)', async () => {
  it('un compte fraîchement créé (secteur + ville, sans profil professionnel complet) apparaît en recherche', async () => {
    const before = (await searchProviders({ sector: 'digital' })).length

    await upsertProviderProfile('real-provider-digital-1', {
      displayName: 'Nouveau Prestataire',
      sector: 'digital',
      city: 'Lomé',
      payoutMethod: 'flooz',
    })

    const results = await searchProviders({ sector: 'digital' })
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

  it('getProviderById retrouve aussi un vrai compte, pas seulement l’annuaire de démo', async () => {
    await upsertProviderProfile('real-provider-digital-2', { displayName: 'Autre Prestataire', sector: 'digital', city: 'Kara' })
    expect((await getProviderById('real-provider-digital-2'))?.displayName).toBe('Autre Prestataire')
  })
})

describe('searchProviders — exclusion des prestataires indisponibles (#290)', async () => {
  it('exclut un prestataire ayant déclaré une indisponibilité couvrant la date demandée', async () => {
    const providerId = randomUUID()
    await upsertProviderProfile(providerId, { displayName: 'Prestataire Dispo', sector: 'digital', city: 'Lomé' })
    addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-10')

    const results = await searchProviders({ sector: 'digital', date: '2026-08-05' })
    expect(results.some((p) => p.id === providerId)).toBe(false)
  })

  it('n’exclut pas ce même prestataire pour une date hors de la période déclarée', async () => {
    const providerId = randomUUID()
    await upsertProviderProfile(providerId, { displayName: 'Prestataire Dispo 2', sector: 'digital', city: 'Lomé' })
    addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-10')

    const results = await searchProviders({ sector: 'digital', date: '2026-08-20' })
    expect(results.some((p) => p.id === providerId)).toBe(true)
  })

  it('n’exclut jamais un prestataire n’ayant déclaré aucune période (comportement par défaut)', async () => {
    const providerId = randomUUID()
    await upsertProviderProfile(providerId, { displayName: 'Prestataire Toujours Dispo', sector: 'digital', city: 'Lomé' })

    const results = await searchProviders({ sector: 'digital', date: '2026-12-25' })
    expect(results.some((p) => p.id === providerId)).toBe(true)
  })
})

describe('resolveProviderRate — tarif fixe pour le paiement en séquestre (#194)', async () => {
  it('renvoie le tarif de l’annuaire de démonstration en priorité', async () => {
    expect(await resolveProviderRate('p01')).toBe(3000)
  })

  it('retombe sur le tarif d’un vrai compte prestataire hors annuaire de démo', async () => {
    await upsertProviderProfile('real-provider-1', { displayName: 'Prestataire Test', sector: 'menage', rateFrom: 4200 })
    expect(await resolveProviderRate('real-provider-1')).toBe(4200)
  })

  it('renvoie null quand aucun tarif n’est disponible', async () => {
    expect(await resolveProviderRate('provider-sans-tarif')).toBeNull()
  })
})
