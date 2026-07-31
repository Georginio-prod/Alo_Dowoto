import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FirstContactForm from '~/components/FirstContactForm.vue'

const fetchMock = vi.fn().mockResolvedValue({})
vi.stubGlobal('$fetch', fetchMock)

afterEach(() => {
  fetchMock.mockClear()
})

function baseProps(sectorSlug: string | null) {
  return { conversationId: 'conv-1', prefillContact: '90123456', providerName: 'Akofa M.', sectorSlug }
}

describe('FirstContactForm (#295 fiche préalable différenciée par métier)', () => {
  it("n'affiche aucun champ additionnel pour un secteur sans configuration", () => {
    const wrapper = mount(FirstContactForm, { props: baseProps('commerce') })
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('affiche les champs additionnels du secteur transport (deux champs texte requis)', () => {
    const wrapper = mount(FirstContactForm, { props: baseProps('transport') })
    expect(wrapper.text()).toContain('Adresse de départ')
    expect(wrapper.text()).toContain("Adresse d'arrivée")
  })

  it('affiche un champ select pour le secteur ménage (fréquence) — flux différent de transport', () => {
    const wrapper = mount(FirstContactForm, { props: baseProps('menage') })
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.text()).toContain('Fréquence souhaitée')
  })

  it('bloque l’envoi tant qu’un champ additionnel requis est vide', async () => {
    const wrapper = mount(FirstContactForm, { props: baseProps('transport') })
    await wrapper.find('#first-contact-description').setValue('Déménagement 3 pièces')
    await wrapper.find('#first-contact-contact').setValue('90123456')

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('envoie sectorAnswers une fois tous les champs requis renseignés', async () => {
    const wrapper = mount(FirstContactForm, { props: baseProps('transport') })
    await wrapper.find('#first-contact-description').setValue('Déménagement 3 pièces')
    await wrapper.find('#first-contact-contact').setValue('90123456')
    await wrapper.find('#first-contact-sector-pickupAddress').setValue('Bè, Lomé')
    await wrapper.find('#first-contact-sector-dropoffAddress').setValue('Agoè, Lomé')

    // Le formulaire s'envoie via `submit` (bouton `type="submit"`), pour que la
    // touche Entrée / « Envoyer » du clavier mobile fonctionne aussi : c'est
    // donc l'événement `submit` qu'il faut déclencher, pas un clic simulé
    // (happy-dom ne déduit pas l'un de l'autre).
    await wrapper.find('form').trigger('submit')

    expect(fetchMock).toHaveBeenCalledWith('/api/conversations/conv-1/first-contact', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        sectorAnswers: { pickupAddress: 'Bè, Lomé', dropoffAddress: 'Agoè, Lomé' },
      }),
    }))
  })
})
