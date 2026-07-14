import { describe, expect, it } from 'vitest'
import { addTestimonial, listTestimonials } from '~~/server/utils/testimonialStore'

describe('testimonialStore (page d’accueil — avis libres)', () => {
  it('inclut des avis d’exemple dès le démarrage, avant toute contribution réelle', () => {
    expect(listTestimonials().length).toBeGreaterThan(0)
  })

  it('ajoute un nouvel avis en tête de liste (le plus récent en premier)', () => {
    const before = listTestimonials().length
    const added = addTestimonial('Nova T.', 'client', "Très bonne expérience, prestataire trouvé rapidement.", 5)

    const after = listTestimonials()
    expect(after.length).toBe(before + 1)
    expect(after[0]?.id).toBe(added.id)
  })

  it('conserve le rôle et la note tels que soumis', () => {
    const added = addTestimonial('Prestataire Test', 'prestataire', 'Je reçois plus de demandes depuis mon abonnement.', 4)
    expect(added.role).toBe('prestataire')
    expect(added.rating).toBe(4)
  })
})
