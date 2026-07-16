export default defineEventHandler(async (event) => {
  const token = getCookie(event, SESSION_COOKIE)
  await destroySession(token)
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
