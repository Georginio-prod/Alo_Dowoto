export default defineEventHandler((event) => {
  const token = getCookie(event, SESSION_COOKIE)
  const user = getSessionUser(token)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Non connecté.' })
  }

  return { user }
})
