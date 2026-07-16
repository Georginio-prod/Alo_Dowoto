export default defineEventHandler(async (event) => {
  return { user: toPublicUser(await requireSessionUser(event)) }
})
