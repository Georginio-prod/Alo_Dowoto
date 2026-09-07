import { describe, expect, it } from 'vitest'
import { getSectorFields } from '~/data/firstContactSectorFields'

const getFields = (sector: string | null | undefined) => getSectorFields(sector, (key) => key)

describe('firstContactSectorFields (#295 fiche préalable différenciée par métier)', () => {
  it('renvoie les champs additionnels du secteur transport (adresses de départ/arrivée)', () => {
    const fields = getFields('transport')
    expect(fields.map((field) => field.key)).toEqual(['pickupAddress', 'dropoffAddress'])
    expect(fields.every((field) => field.required)).toBe(true)
  })

  it('renvoie des champs différents pour le secteur ménage (fréquence + adresse)', () => {
    const fields = getFields('menage')
    expect(fields.map((field) => field.key)).toEqual(['frequency', 'address'])
    expect(fields[0]?.type).toBe('select')
  })

  it('confirme que transport et ménage utilisent bien des flux différenciés (au moins deux catégories)', () => {
    expect(getFields('transport')).not.toEqual(getFields('menage'))
  })

  it('renvoie un tableau vide pour un secteur sans champ additionnel configuré', () => {
    expect(getFields('commerce')).toEqual([])
  })

  it('renvoie un tableau vide pour un secteur null/undefined (cas limite)', () => {
    expect(getFields(null)).toEqual([])
    expect(getFields(undefined)).toEqual([])
  })

  it('un champ select expose ses options', () => {
    const interventionType = getFields('btp').find((field) => field.key === 'interventionType')
    expect(interventionType?.options?.map((option) => option.value)).toEqual(['devis', 'reparation', 'installation'])
  })
})
