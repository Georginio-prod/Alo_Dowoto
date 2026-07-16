import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WalletMovementList from '~/components/WalletMovementList.vue'
import type { WalletMovement } from '~~/server/utils/walletStore'

function movement(overrides: Partial<WalletMovement> = {}): WalletMovement {
  return {
    id: 'm1',
    walletUserId: 'u1',
    type: 'recharge',
    amount: 5000,
    reference: 'REF-12345678',
    counterpartyUserId: null,
    createdAt: Date.now(),
    ...overrides,
  }
}

// toLocaleString('fr-FR') sépare les milliers avec une espace insécable
// selon l'environnement ICU : normaliser avant assertion pour ne pas
// dépendre du caractère exact utilisé.
function normalizeSpaces(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ')
}

describe('WalletMovementList (#190 historique du portefeuille)', () => {
  it('affiche un message quand il n’y a aucun mouvement', () => {
    const wrapper = mount(WalletMovementList, { props: { movements: [] } })
    expect(wrapper.text()).toContain('Aucun mouvement.')
  })

  it('affiche les mouvements avec le signe attendu selon le type', () => {
    const wrapper = mount(WalletMovementList, {
      props: {
        movements: [
          movement({ id: 'm1', type: 'recharge', amount: 5000 }),
          movement({ id: 'm2', type: 'escrow_debit', amount: 3000 }),
        ],
      },
    })
    const items = wrapper.findAll('li').map((li) => normalizeSpaces(li.text()))
    expect(items[0]).toContain('+5 000 F CFA')
    expect(items[1]).toContain('3 000 F CFA')
  })

  it('filtre par type de mouvement', async () => {
    const wrapper = mount(WalletMovementList, {
      props: {
        movements: [
          movement({ id: 'm1', type: 'recharge', reference: 'RECHARGE-1' }),
          movement({ id: 'm2', type: 'escrow_debit', reference: 'ORDER-1' }),
        ],
      },
    })

    await wrapper.find('select[aria-label="Filtrer par type de mouvement"]').setValue('escrow_debit')

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(1)
    expect(items[0]?.text()).toContain('Paiement en séquestre')
  })

  it('filtre par période (cas limite : mouvement hors période exclu)', async () => {
    const now = Date.now()
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000

    const wrapper = mount(WalletMovementList, {
      props: {
        movements: [
          movement({ id: 'recent', createdAt: now, reference: 'RECENT-1' }),
          movement({ id: 'old', createdAt: eightDaysAgo, reference: 'OLD-1' }),
        ],
      },
    })

    await wrapper.find('select[aria-label="Filtrer par période"]').setValue('7d')

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(1)
    expect(items[0]?.text()).toContain('RECENT-1')
  })
})
