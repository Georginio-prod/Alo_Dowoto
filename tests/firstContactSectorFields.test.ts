import { describe, expect, it } from 'vitest'
import { FIRST_CONTACT_SECTOR_FIELDS, getSectorFields } from '~/data/firstContactSectorFields'

describe('firstContactSectorFields (#295 fiche préalable différenciée par métier)', () => {
  it('renvoie les champs additionnels du secteur transport (adresses de départ/arrivée)', () => {
    const fields = getSectorFields('transport')
    expect(fields.map((field) => field.key)).toEqual(['pickupAddress', 'dropoffAddress'])
    expect(fields.every((field) => field.required)).toBe(true)
  })

  it('renvoie des champs différents pour le secteur ménage (fréquence + adresse)', () => {
    const fields = getSectorFields('menage')
    expect(fields.map((field) => field.key)).toEqual(['frequency', 'address'])
    expect(fields[0]?.type).toBe('select')
  })

  it('confirme que transport et ménage utilisent bien des flux différenciés (au moins deux catégories)', () => {
    expect(getSectorFields('transport')).not.toEqual(getSectorFields('menage'))
  })

  it('renvoie un tableau vide pour un secteur sans champ additionnel configuré', () => {
    expect(getSectorFields('commerce')).toEqual([])
  })

  it('renvoie un tableau vide pour un secteur null/undefined (cas limite)', () => {
    expect(getSectorFields(null)).toEqual([])
    expect(getSectorFields(undefined)).toEqual([])
  })

  it('un champ select expose ses options', () => {
    const interventionType = FIRST_CONTACT_SECTOR_FIELDS.btp?.find((field) => field.key === 'interventionType')
    expect(interventionType?.options?.map((option) => option.value)).toEqual(['devis', 'reparation', 'installation'])
  })
})
