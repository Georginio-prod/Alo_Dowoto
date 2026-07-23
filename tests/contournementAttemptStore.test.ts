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
    // busy-wait volontaire : le store horodate via Date.now() (respecté par le mapper Prisma).
  }
}

describe('contournementAttemptStore (#265, journal pour l’équipe support, persistance #357)', () => {
  it('enregistre une tentative avec un extrait tronqué du message', async () => {
    const userId = id()
    const conversationId = id()
    const attempt = await logContournementAttempt({ conversationId, userId, reason: 'phone', text: '90 12 34 56' })

    expect(attempt.reason).toBe('phone')
    expect(attempt.excerpt).toBe('90 12 34 56')
    expect((await listContournementAttempts()).some((a) => a.id === attempt.id)).toBe(true)
  })

  it('tronque les extraits trop longs (pas le message intégral conservé)', async () => {
    const userId = id()
    const longText = 'a'.repeat(500)
    const attempt = await logContournementAttempt({ conversationId: id(), userId, reason: 'off_platform_mention', text: longText })

    expect(attempt.excerpt.length).toBe(200)
  })

  it('listContournementAttemptsForUser ne renvoie que les tentatives de cet utilisateur', async () => {
    const userA = id()
    const userB = id()
    await logContournementAttempt({ conversationId: id(), userId: userA, reason: 'email', text: 'a@b.com' })
    await logContournementAttempt({ conversationId: id(), userId: userB, reason: 'phone', text: '90123456' })

    const forA = await listContournementAttemptsForUser(userA)
    expect(forA.every((a) => a.userId === userA)).toBe(true)
    expect(forA.some((a) => a.userId === userB)).toBe(false)
  })

  it('liste les tentatives les plus récentes en premier', async () => {
    const userId = id()
    const first = await logContournementAttempt({ conversationId: id(), userId, reason: 'phone', text: '90123456' })
    tick()
    const second = await logContournementAttempt({ conversationId: id(), userId, reason: 'email', text: 'a@b.com' })

    const forUser = await listContournementAttemptsForUser(userId)
    const firstIndex = forUser.findIndex((a) => a.id === first.id)
    const secondIndex = forUser.findIndex((a) => a.id === second.id)
    expect(secondIndex).toBeLessThan(firstIndex)
  })
})
