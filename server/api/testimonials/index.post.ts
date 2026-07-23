interface CreateTestimonialBody {
  name?: string
  role?: string
  message?: string
  rating?: number
}

/**
 * Ouvert à tout visiteur (pas de session requise) : contrairement aux
 * notations de collaboration (reviewStore.ts), ces avis généraux ne sont
 * rattachés à aucun compte ni conversation précise.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTestimonialBody>(event)

  const name = body?.name?.trim() ?? ''
  const message = body?.message?.trim() ?? ''
  const role = body?.role === 'prestataire' ? 'prestataire' : body?.role === 'client' ? 'client' : undefined
  const rating = Number(body?.rating)

  if (name.length < 2 || name.length > 60) {
    badRequest('Le nom doit contenir entre 2 et 60 caractères.')
  }
  if (!role) {
    badRequest('Précisez si vous êtes chercheur ou prestataire.')
  }
  if (message.length < 10 || message.length > 400) {
    badRequest('Le message doit contenir entre 10 et 400 caractères.')
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    badRequest('La note doit être un nombre entier entre 1 et 5.')
  }

  const testimonial = await addTestimonial(name, role, message, rating)
  return { testimonial }
})
