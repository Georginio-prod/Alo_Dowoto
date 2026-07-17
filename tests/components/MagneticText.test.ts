import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MagneticText from '~/components/MagneticText.vue'

function stubMatchMedia(reduceMotion: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

describe('MagneticText (#226 curseur magnétique du titre d’accueil)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('affiche toujours le texte réel, lisible indépendamment du survol', async () => {
    stubMatchMedia(false)
    const wrapper = mount(MagneticText, {
      props: { text: 'Trouvez le bon prestataire, dans tous les secteurs', hoverText: 'On s’occupe de tout, vous choisissez.' },
    })
    await flushPromises()

    expect(wrapper.find('.magnetic-text__base').text()).toBe('Trouvez le bon prestataire, dans tous les secteurs')
  })

  it('rend le texte de survol dans une couche aria-hidden (jamais la seule source du contenu accessible)', async () => {
    stubMatchMedia(false)
    const wrapper = mount(MagneticText, {
      props: { text: 'Titre', hoverText: 'Survol' },
    })
    await flushPromises()

    const reveal = wrapper.find('.magnetic-text__reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.attributes('aria-hidden')).toBe('true')
    expect(reveal.text()).toBe('Survol')
  })

  it('désactive entièrement le cercle si prefers-reduced-motion est actif (texte statique)', async () => {
    stubMatchMedia(true)
    const wrapper = mount(MagneticText, {
      props: { text: 'Titre', hoverText: 'Survol' },
    })
    await flushPromises()

    expect(wrapper.find('.magnetic-text__reveal').exists()).toBe(false)
    expect(wrapper.find('.magnetic-text__base').text()).toBe('Titre')
  })
})
