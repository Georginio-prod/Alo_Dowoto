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

  const authRole = typeof to.meta.authRole === 'string' ? to.meta.authRole : undefined

  if (!user.value) {
    // Le point d'entrée figé dans l'APK déjà installé demande /dashboard. Pour
    // que la coquille mobile déployée ouvre le nouveau parcours d'onboarding
    // sans réinstallation, un visiteur non connecté sur /dashboard est envoyé
    // vers l'écran d'accueil animé (/m/welcome) — qui enchaîne sur /m/auth. Les
    // autres pages protégées conservent la connexion classique (/auth).
    if (to.path === '/dashboard') {
      return navigateTo('/m/welcome')
    }
    return navigateTo({ path: '/auth', query: authRole ? { role: authRole } : {} })
  }

  // `authRole` était jusqu'ici seulement recopié dans l'URL de connexion :
  // un compte chercheur pouvait ouvrir tout l'espace prestataire
  // (/prestataire, /prestataire/solde…) et y voir des écrans vides ou en
  // erreur, les API sous-jacentes exigeant elles le bon rôle. Les pages
  // partagées (messagerie, profil) ne déclarent pas `authRole` et restent
  // donc accessibles aux deux rôles.
  if (authRole && user.value.role !== authRole) {
    return navigateTo(user.value.role === 'prestataire' ? '/prestataire' : '/dashboard/client')
  }
})
