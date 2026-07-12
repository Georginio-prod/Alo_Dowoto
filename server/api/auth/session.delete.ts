export default defineEventHandler((event) => {
  const token = getCookie(event, SESSION_COOKIE)
  destroySession(token)
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
