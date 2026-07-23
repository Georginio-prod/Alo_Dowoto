export default defineEventHandler(async () => {
  return { testimonials: await listTestimonials() }
})
