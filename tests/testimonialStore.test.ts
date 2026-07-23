import { describe, expect, it } from 'vitest'
import { addTestimonial, listTestimonials } from '~~/server/utils/testimonialStore'

describe('testimonialStore (page d’accueil — avis libres, persistance #357)', () => {
  it('inclut des avis d’exemple dès le démarrage, avant toute contribution réelle', async () => {
    expect((await listTestimonials()).length).toBeGreaterThan(0)
  })

  it('ajoute un nouvel avis en tête de liste (le plus récent en premier)', async () => {
    const before = (await listTestimonials()).length
    const added = await addTestimonial('Nova T.', 'client', "Très bonne expérience, prestataire trouvé rapidement.", 5)

    const after = await listTestimonials()
    expect(after.length).toBe(before + 1)
    expect(after[0]?.id).toBe(added.id)
  })

  it('conserve le rôle et la note tels que soumis', async () => {
    const added = await addTestimonial('Prestataire Test', 'prestataire', 'Je reçois plus de demandes depuis mon abonnement.', 4)
    expect(added.role).toBe('prestataire')
    expect(added.rating).toBe(4)
  })
})
