/**
 * Ouvert à tout visiteur (pas de session requise) : contrairement aux
 * notations de collaboration (reviewStore.ts), ces avis généraux ne sont
 * rattachés à aucun compte ni conversation précise.
 */
export default defineEventHandler(async (event) => {
  const { name, role, message, rating } = await readSchemaBody(event, createTestimonialSchema)

  const testimonial = addTestimonial(name, role, message, rating)
  return { testimonial }
})
