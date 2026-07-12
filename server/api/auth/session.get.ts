export default defineEventHandler((event) => {
  return { user: requireSessionUser(event) }
})
