import { describe, expect, it } from 'vitest'
import { createServiceRequest, listRequestsByUser } from '~~/server/utils/requestStore'

/** Attend le prochain tick d'horloge pour garantir des `createdAt` distincts et déterministes. */
function tick() {
  const start = Date.now()
  while (Date.now() === start) {
    // busy-wait volontaire : le store utilise Date.now() en interne, sans horloge injectable.
  }
}

describe('listRequestsByUser — « Mon espace » chercheur (#64)', () => {
  it('ne renvoie que les demandes de cet utilisateur', () => {
    createServiceRequest('client-space-1', {
      title: 'Ménage',
      skills: ['Ménage à domicile'],
      description: '',
      budgetMax: 5000,
      urgency: 'flexible',
      location: 'Lomé',
      sector: 'menage',
    })
    createServiceRequest('client-space-2', {
      title: 'Plomberie',
      skills: ['Plomberie'],
      description: '',
      budgetMax: 8000,
      urgency: 'immediate',
      location: 'Lomé',
      sector: 'btp',
    })

    const mine = listRequestsByUser('client-space-1')
    expect(mine).toHaveLength(1)
    expect(mine[0]?.title).toBe('Ménage')
  })

  it('trie les demandes de la plus récente à la plus ancienne', () => {
    const older = createServiceRequest('client-space-3', {
      title: 'Première demande',
      skills: ['Ménage à domicile'],
      description: '',
      budgetMax: 5000,
      urgency: 'flexible',
      location: 'Lomé',
      sector: 'menage',
    })
    tick()
    const newer = createServiceRequest('client-space-3', {
      title: 'Deuxième demande',
      skills: ['Plomberie'],
      description: '',
      budgetMax: 5000,
      urgency: 'flexible',
      location: 'Lomé',
      sector: 'btp',
    })

    const mine = listRequestsByUser('client-space-3')
    expect(mine.map((r) => r.id)).toEqual([newer.id, older.id])
  })

  it('renvoie une liste vide pour un utilisateur sans demande (cas limite)', () => {
    expect(listRequestsByUser('client-sans-demande')).toEqual([])
  })
})
