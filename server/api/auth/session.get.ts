export default defineEventHandler((event) => {
  return { user: toPublicUser(requireSessionUser(event)) }
})
