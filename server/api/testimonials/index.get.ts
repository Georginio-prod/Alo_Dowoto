/** `?locale=` (#i18n) : sélectionne la langue des avis d'exemple (voir testimonialStore.ts) — les contributions réelles ne sont jamais traduites. */
export default defineEventHandler(async (event) => {
  const locale = getQuery(event).locale === 'en' ? 'en' : 'fr'
  return { testimonials: await listTestimonials(locale) }
})
