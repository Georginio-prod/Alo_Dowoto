import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PlanCard from '~/components/PlanCard.vue'
import { PLANS } from '~/data/plans'

describe('PlanCard (#29 sélection de formule d’abonnement)', () => {
  it('affiche "Choisir cette formule" quand non sélectionnée', () => {
    const wrapper = mount(PlanCard, { props: { plan: PLANS[0], selected: false } })
    expect(wrapper.text()).toContain('Choisir cette formule')
    expect(wrapper.text()).not.toContain('Sélectionné')
  })

  it('affiche "Sélectionné" quand sélectionnée', () => {
    const wrapper = mount(PlanCard, { props: { plan: PLANS[0], selected: true } })
    expect(wrapper.text()).toContain('Sélectionné')
  })

  it('émet "select" au clic sur le bouton', async () => {
    const wrapper = mount(PlanCard, { props: { plan: PLANS[1], selected: false } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('affiche le badge du plan quand présent (cas limite : plan sans tag)', () => {
    const withTag = mount(PlanCard, { props: { plan: PLANS[1], selected: false } })
    expect(PLANS[1]?.hasTag).toBe(true)
    expect(withTag.find('.absolute').exists()).toBe(true)

    const withoutTag = mount(PlanCard, { props: { plan: PLANS[0], selected: false } })
    expect(PLANS[0]?.hasTag).toBe(false)
    expect(withoutTag.find('.absolute').exists()).toBe(false)
  })
})
