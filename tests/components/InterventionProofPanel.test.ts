import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InterventionProofPanel from '~/components/InterventionProofPanel.vue'
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'

const fetchMock = vi.fn().mockResolvedValue({})
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('navigator', { geolocation: undefined })

afterEach(() => {
  fetchMock.mockClear()
})

function order(overrides: Partial<EscrowOrder> = {}): EscrowOrder {
  return {
    id: 'order-1',
    conversationId: 'conv-1',
    clientId: 'client-1',
    providerId: 'provider-1',
    amount: 5000,
    status: 'in_escrow',
    createdAt: 1_000,
    paidAt: 1_000,
    deliveredAt: null,
    releasedAt: null,
    cancelledAt: null,
    cancelReason: null,
    disputedAt: null,
    disputeReason: null,
    disputeEvidence: null,
    disputeResponse: null,
    disputeRespondedAt: null,
    checkInAt: null,
    checkInLocation: null,
    checkOutAt: null,
    checkOutLocation: null,
    ...overrides,
  }
}

describe('InterventionProofPanel (#268 preuve d’intervention in-app)', () => {
  it('propose le check-in tant qu’aucune arrivée n’est enregistrée', () => {
    const wrapper = mount(InterventionProofPanel, { props: { escrowOrder: order(), conversationId: 'conv-1' } })
    expect(wrapper.text()).toContain('Check-in (arrivée)')
    expect(wrapper.text()).not.toContain('Check-out (départ)')
  })

  it('propose le check-out une fois le check-in enregistré', () => {
    const wrapper = mount(InterventionProofPanel, {
      props: { escrowOrder: order({ checkInAt: 2_000 }), conversationId: 'conv-1' },
    })
    expect(wrapper.text()).toContain('Arrivée enregistrée')
    expect(wrapper.text()).toContain('Check-out (départ)')
  })

  it('indique que la prestation peut être marquée terminée une fois les deux enregistrés', () => {
    const wrapper = mount(InterventionProofPanel, {
      props: { escrowOrder: order({ checkInAt: 2_000, checkOutAt: 3_000 }), conversationId: 'conv-1' },
    })
    expect(wrapper.text()).toContain('Départ enregistré')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('appelle l’API check-in au clic (sans géolocalisation disponible)', async () => {
    const wrapper = mount(InterventionProofPanel, { props: { escrowOrder: order(), conversationId: 'conv-1' } })
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/conversations/conv-1/check-in', { method: 'POST', body: {} })
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
