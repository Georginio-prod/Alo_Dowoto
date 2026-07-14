/**
 * Garde de route pour les pages « Mon espace » (dashboard, messages,
 * favoris…) : avant ce middleware, ces pages n'importaient que
 * `useFetch('/api/auth/session')` et affichaient silencieusement un état
 * vide ("Bonjour vous", aucune conversation…) à un visiteur non connecté au
 * lieu de le renvoyer vers /auth — la page semblait fonctionner mais
 * n'affichait jamais les vraies données de personne.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loaded, refresh } = useSession()
  if (!loaded.value) await refresh()

  if (!user.value) {
    const authRole = typeof to.meta.authRole === 'string' ? to.meta.authRole : undefined
    return navigateTo({ path: '/auth', query: authRole ? { role: authRole } : {} })
  }
})
