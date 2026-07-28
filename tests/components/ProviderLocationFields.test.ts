import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProviderLocationFields from '~/components/ProviderLocationFields.vue'

/**
 * ProviderLocationFields.vue (#geoloc, 1.2) : PositionMapPicker.client.vue
 * (Leaflet) est stubbé — cette suite couvre la logique du formulaire
 * (quartier, rayon d'intervention, position approximative, géolocalisation
 * indisponible), pas le rendu de la carte elle-même.
 */
function mountFields(props: Partial<Record<string, unknown>> = {}) {
  return mount(ProviderLocationFields, {
    props: {
      city: '',
      quartier: '',
      adresse: '',
      pointsDeRepere: '',
      positionApproximative: true,
      ...props,
    },
    global: { stubs: { PositionMapPicker: true } },
  })
}

describe('ProviderLocationFields', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('liste les quartiers de la Région Maritime', () => {
    const wrapper = mountFields()
    expect(wrapper.find('option[value="tokoin"]').exists()).toBe(true)
  })

  it('émet le rayon d’intervention déplacé (en km)', async () => {
    const wrapper = mountFields()
    await wrapper.find('#plf-rayon').setValue('25')
    expect(wrapper.emitted('update:rayonInterventionKm')?.at(-1)).toEqual([25])
  })

  it('émet le changement de réglage de position approximative', async () => {
    const wrapper = mountFields({ positionApproximative: true })
    await wrapper.find('input[type="checkbox"]').setValue(false)
    expect(wrapper.emitted('update:positionApproximative')?.at(-1)).toEqual([false])
  })

  it('signale un message clair quand la géolocalisation n’est pas disponible', async () => {
    vi.stubGlobal('navigator', { geolocation: undefined })
    const wrapper = mountFields()

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain("n'est pas disponible")
  })
})
