import { describe, expect, it } from 'vitest'
import { getSectorFieldsFr } from '~/data/firstContactSectorFields'

describe('firstContactSectorFields (#295 fiche préalable différenciée par métier)', () => {
  it('renvoie les champs additionnels du secteur transport (adresses de départ/arrivée)', () => {
    const fields = getSectorFieldsFr('transport')
    expect(fields.map((field) => field.key)).toEqual(['pickupAddress', 'dropoffAddress'])
    expect(fields.every((field) => field.required)).toBe(true)
  })

  it('renvoie des champs différents pour le secteur ménage (fréquence + adresse)', () => {
    const fields = getSectorFieldsFr('menage')
    expect(fields.map((field) => field.key)).toEqual(['frequency', 'address'])
    expect(fields[0]?.type).toBe('select')
  })

  it('confirme que transport et ménage utilisent bien des flux différenciés (au moins deux catégories)', () => {
    expect(getSectorFieldsFr('transport')).not.toEqual(getSectorFieldsFr('menage'))
  })

  it('renvoie un tableau vide pour un secteur sans champ additionnel configuré', () => {
    expect(getSectorFieldsFr('commerce')).toEqual([])
  })

  it('renvoie un tableau vide pour un secteur null/undefined (cas limite)', () => {
    expect(getSectorFieldsFr(null)).toEqual([])
    expect(getSectorFieldsFr(undefined)).toEqual([])
  })

  it('un champ select expose ses options', () => {
    const interventionType = getSectorFieldsFr('btp').find((field) => field.key === 'interventionType')
    expect(interventionType?.options?.map((option) => option.value)).toEqual(['devis', 'reparation', 'installation'])
  })
})
