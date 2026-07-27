import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LocationRadiusPicker from '~/components/LocationRadiusPicker.vue'
import { RADIUS_SLIDER_OPTIONS_KM } from '~/data/searchRadius'

/**
 * LocationRadiusPicker.vue (#geoloc, 1.1/1.3) : géolocalisation avec repli
 * quartier, jamais bloquant. Le rendu carte lui-même (ProviderMap.client.vue,
 * Leaflet) n'est pas couvert ici — comportement visuel vérifié manuellement
 * (voir la description de la PR), cette suite se concentre sur la logique
 * (mutuellement exclusif position/quartier, mapping du curseur de rayon).
 */
describe('LocationRadiusPicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('liste les quartiers de la Région Maritime dans le sélecteur', () => {
    const wrapper = mount(LocationRadiusPicker, { props: { quartier: '', radiusKm: 5 } })
    expect(wrapper.find('option[value="be"]').exists()).toBe(true)
  })

  it('choisir un quartier efface une position déjà détectée', async () => {
    const wrapper = mount(LocationRadiusPicker, { props: { latitude: 6.14, longitude: 1.23, quartier: '', radiusKm: 5 } })

    await wrapper.find('#picker-quartier').setValue('be')

    expect(wrapper.emitted('update:latitude')?.at(-1)).toEqual([undefined])
    expect(wrapper.emitted('update:longitude')?.at(-1)).toEqual([undefined])
  })

  it('« Retirer ma position » n’apparaît que si une position est connue', () => {
    const withoutPosition = mount(LocationRadiusPicker, { props: { quartier: '', radiusKm: 5 } })
    expect(withoutPosition.text()).not.toContain('Retirer ma position')

    const withPosition = mount(LocationRadiusPicker, { props: { latitude: 6.14, longitude: 1.23, quartier: '', radiusKm: 5 } })
    expect(withPosition.text()).toContain('Retirer ma position')
  })

  it('déplacer le curseur de rayon émet la valeur en km correspondante (pas l’index)', async () => {
    const wrapper = mount(LocationRadiusPicker, { props: { quartier: '', radiusKm: 5 } })
    const slider = wrapper.find('#picker-radius')

    const targetIndex = RADIUS_SLIDER_OPTIONS_KM.indexOf(20)
    await slider.setValue(String(targetIndex))

    expect(wrapper.emitted('update:radiusKm')?.at(-1)).toEqual([20])
  })

  it('signale un message clair quand la géolocalisation n’est pas disponible', async () => {
    vi.stubGlobal('navigator', { geolocation: undefined })
    const wrapper = mount(LocationRadiusPicker, { props: { quartier: '', radiusKm: 5 } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain("n'est pas disponible")
  })

  it('détecte la position et l’émet, en effaçant le quartier précédemment choisi', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 6.14, longitude: 1.23 } } as GeolocationPosition)
        },
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve({ address: {} }) }))

    const wrapper = mount(LocationRadiusPicker, { props: { quartier: 'be', radiusKm: 5 } })
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:latitude')?.at(-1)).toEqual([6.14])
    expect(wrapper.emitted('update:longitude')?.at(-1)).toEqual([1.23])
    expect(wrapper.emitted('update:quartier')?.at(-1)).toEqual([''])
  })
})
