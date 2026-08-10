import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { listSeenSections, markSectionSeen, resetProgress } from '~~/server/utils/tutorialProgressStore'

/** Progression des tutoriels (#tutoriel-onboarding) — sync serveur. */
describe('tutorialProgressStore', () => {
  it('marque une section vue puis la liste', async () => {
    const userId = randomUUID()
    expect(await listSeenSections(userId)).toEqual([])
    await markSectionSeen(userId, 'dashboard-seeker')
    expect(await listSeenSections(userId)).toEqual(['dashboard-seeker'])
  })

  it('upsert idempotent : re-marquer une section n’ajoute pas de doublon', async () => {
    const userId = randomUUID()
    await markSectionSeen(userId, 's1')
    await markSectionSeen(userId, 's1')
    expect(await listSeenSections(userId)).toEqual(['s1'])
  })

  it('n’isole pas les utilisateurs entre eux', async () => {
    const a = randomUUID()
    const b = randomUUID()
    await markSectionSeen(a, 'sa')
    await markSectionSeen(b, 'sb')
    expect(await listSeenSections(a)).toEqual(['sa'])
    expect(await listSeenSections(b)).toEqual(['sb'])
  })

  it('reset supprime toute la progression de l’utilisateur', async () => {
    const userId = randomUUID()
    await markSectionSeen(userId, 's1')
    await markSectionSeen(userId, 's2')
    await resetProgress(userId)
    expect(await listSeenSections(userId)).toEqual([])
  })
})
