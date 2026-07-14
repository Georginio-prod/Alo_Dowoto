import type { PublicUser } from '~~/server/utils/userStore'

/**
 * État de session partagé (#session-flow) : avant, chaque composant qui
 * avait besoin de l'utilisateur connecté faisait son propre
 * `useFetch('/api/auth/session')` indépendant. Comme `AppHeader` reste
 * monté d'une navigation à l'autre (il vit dans le layout, hors de
 * `<slot/>`), son `sessionUser` ne se remettait jamais à jour après une
 * connexion ou une déconnexion réussie ailleurs dans l'app — l'en-tête
 * pouvait afficher « Se connecter » juste après une inscription, ou
 * l'inverse après une déconnexion, jusqu'au prochain rechargement complet.
 * `useState` partage la même ref réactive entre tous les appelants (et à
 * travers le payload SSR), donc `set()`/`clear()` appelés n'importe où se
 * répercutent immédiatement partout, sans navigation ni remount.
 */
export function useSession() {
  const user = useState<PublicUser | null>('session-user', () => null)
  const loaded = useState('session-loaded', () => false)
  // Le `$fetch` global ne transmet pas le cookie de la requête entrante
  // pendant le SSR (seul le navigateur le fait automatiquement côté client)
  // — sans `useRequestFetch()`, un rechargement complet d'une page protégée
  // par un utilisateur pourtant connecté voyait toujours une session vide et
  // se faisait renvoyer vers /auth.
  const requestFetch = useRequestFetch()

  async function refresh() {
    try {
      const { user: fetched } = await requestFetch<{ user: PublicUser }>('/api/auth/session')
      user.value = fetched
    } catch {
      user.value = null
    } finally {
      loaded.value = true
    }
  }

  /** À utiliser pour un premier chargement : ne refait pas la requête si déjà résolue. */
  async function ensure() {
    if (!loaded.value) await refresh()
  }

  function set(nextUser: PublicUser) {
    user.value = nextUser
    loaded.value = true
  }

  function clear() {
    user.value = null
    loaded.value = true
  }

  return { user, loaded, refresh, ensure, set, clear }
}
