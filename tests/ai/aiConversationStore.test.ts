import { describe, expect, it } from 'vitest'
import { appendConversationTurn, clearConversationHistory, getConversationHistory } from '~~/server/utils/aiConversationStore'

describe('aiConversationStore (#geoloc, 2.2, historique par utilisateur)', () => {
  it('ne renvoie rien pour une clé sans historique', () => {
    expect(getConversationHistory('conv-empty')).toEqual([])
  })

  it('ajoute un tour (message utilisateur + réponse assistant) dans l’ordre', () => {
    const history = appendConversationTurn(
      'conv-1',
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Bonjour, comment puis-je vous aider ?' },
    )
    expect(history).toEqual([
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Bonjour, comment puis-je vous aider ?' },
    ])
    expect(getConversationHistory('conv-1')).toEqual(history)
  })

  it('tronque l’historique conservé au-delà de la limite', () => {
    const key = 'conv-long'
    for (let i = 0; i < 15; i++) {
      appendConversationTurn(key, { role: 'user', content: `message ${i}` }, { role: 'assistant', content: `réponse ${i}` })
    }
    const history = getConversationHistory(key)
    expect(history.length).toBeLessThanOrEqual(20)
    // Les messages les plus récents sont conservés, pas les plus anciens.
    expect(history.at(-2)).toEqual({ role: 'user', content: 'message 14' })
  })

  it('efface l’historique d’une clé', () => {
    appendConversationTurn('conv-clear', { role: 'user', content: 'x' }, { role: 'assistant', content: 'y' })
    clearConversationHistory('conv-clear')
    expect(getConversationHistory('conv-clear')).toEqual([])
  })
})
