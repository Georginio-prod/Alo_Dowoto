import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  listContournementAttempts,
  listContournementAttemptsForUser,
  logContournementAttempt,
} from '~~/server/utils/contournementAttemptStore'

function id(): string {
  return randomUUID()
}

/** Attend le prochain tick d'horloge pour garantir des `createdAt` distincts et déterministes. */
function tick() {
  const start = Date.now()
  while (Date.now() === start) {
    // busy-wait volontaire : le store utilise Date.now() en interne, sans horloge injectable.
  }
}

describe('contournementAttemptStore (#265, journal pour l’équipe support)', () => {
  it('enregistre une tentative avec un extrait tronqué du message', () => {
    const userId = id()
    const conversationId = id()
    const attempt = logContournementAttempt({ conversationId, userId, reason: 'phone', text: '90 12 34 56' })

    expect(attempt.reason).toBe('phone')
    expect(attempt.excerpt).toBe('90 12 34 56')
    expect(listContournementAttempts().some((a) => a.id === attempt.id)).toBe(true)
  })

  it('tronque les extraits trop longs (pas le message intégral conservé)', () => {
    const userId = id()
    const longText = 'a'.repeat(500)
    const attempt = logContournementAttempt({ conversationId: id(), userId, reason: 'off_platform_mention', text: longText })

    expect(attempt.excerpt.length).toBe(200)
  })

  it('listContournementAttemptsForUser ne renvoie que les tentatives de cet utilisateur', () => {
    const userA = id()
    const userB = id()
    logContournementAttempt({ conversationId: id(), userId: userA, reason: 'email', text: 'a@b.com' })
    logContournementAttempt({ conversationId: id(), userId: userB, reason: 'phone', text: '90123456' })

    const forA = listContournementAttemptsForUser(userA)
    expect(forA.every((a) => a.userId === userA)).toBe(true)
    expect(forA.some((a) => a.userId === userB)).toBe(false)
  })

  it('liste les tentatives les plus récentes en premier', () => {
    const userId = id()
    const first = logContournementAttempt({ conversationId: id(), userId, reason: 'phone', text: '90123456' })
    tick()
    const second = logContournementAttempt({ conversationId: id(), userId, reason: 'email', text: 'a@b.com' })

    const forUser = listContournementAttemptsForUser(userId)
    const firstIndex = forUser.findIndex((a) => a.id === first.id)
    const secondIndex = forUser.findIndex((a) => a.id === second.id)
    expect(secondIndex).toBeLessThan(firstIndex)
  })
})
