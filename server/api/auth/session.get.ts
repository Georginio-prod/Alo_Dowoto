export default defineEventHandler(async (event) => {
  return { user: await toPublicUser(await requireSessionUser(event)) }
})
