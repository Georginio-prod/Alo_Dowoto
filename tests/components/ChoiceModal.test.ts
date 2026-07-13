import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChoiceModal from '~/components/ChoiceModal.vue'

describe('ChoiceModal (#15) — la modale se referme au choix', () => {
  const navigateToMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('navigateTo', navigateToMock)
  })

  afterEach(() => {
    navigateToMock.mockClear()
    vi.unstubAllGlobals()
  })

  it('émet "cancel" en plus de naviguer au choix "Je cherche un service" (sinon la modale reste affichée par-dessus la page suivante)', async () => {
    const wrapper = mount(ChoiceModal, {
      props: { searchTerm: 'Ménage à domicile' },
      global: { stubs: { teleport: true } },
    })

    await wrapper.findAll('button')[0]?.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/auth',
      query: { role: 'client', q: 'Ménage à domicile' },
    })
  })

  it('émet "cancel" en plus de naviguer au choix "Je propose un service"', async () => {
    const wrapper = mount(ChoiceModal, { props: { searchTerm: null }, global: { stubs: { teleport: true } } })

    // Le deuxième bouton du groupe de choix ("Je propose un service").
    await wrapper.findAll('button')[1]?.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(navigateToMock).toHaveBeenCalledWith({ path: '/auth', query: { role: 'prestataire' } })
  })

  it('émet "cancel" au clic sur "Annuler" (cas limite : pas de double navigation)', async () => {
    const wrapper = mount(ChoiceModal, { props: {}, global: { stubs: { teleport: true } } })

    await wrapper.findAll('button')[2]?.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
