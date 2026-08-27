import type { FetchOptions } from 'ofetch'
import { parseMigratedPrefixes, resolveApiBase } from '~/utils/apiTarget'

/** Signature minimale de fetch, agnostique des routes internes typées de Nuxt. */
type ApiFetch = <T>(path: string, options?: FetchOptions) => Promise<T>

/**
 * Client API unique de l'application — le SEUL point par lequel les appels
 * `/api/**` doivent passer (voir docs/adr, extraction backend). Il aiguille
 * chaque requête vers l'API Nitro (par défaut) ou vers le backend Express, selon
 * `resolveApiBase`, sans que l'appelant ait à le savoir.
 *
 * Comportement PAR DÉFAUT strictement identique à aujourd'hui : chemin relatif
 * même origine, avec forwarding du cookie de session en SSR (`useRequestFetch`)
 * — indispensable pour les pages protégées rendues côté serveur (voir
 * useSession). C'est ce qui rend l'adoption sûre sur un site déjà en ligne.
 *
 * Adoption : remplacer `useRequestFetch()`/`$fetch('/api/...')` par
 * `const { apiFetch } = useApi()` puis `apiFetch('/api/...')`. Tant qu'aucun
 * domaine n'est migré, rien ne change.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const backendBaseUrl = String(config.public.backendBaseUrl ?? '')
  const migratedPrefixes = parseMigratedPrefixes(String(config.public.migratedApiPrefixes ?? ''))

  // Cast vers le `$Fetch` générique d'ofetch : on veut un wrapper agnostique du
  // chemin. Le `$fetch`/`requestFetch` typés de Nuxt infèrent le type de retour
  // par route interne connue, ce qui rejette un chemin dynamique et fait
  // exploser la profondeur d'instanciation TS. Le comportement runtime (dont le
  // forwarding cookie SSR de requestFetch) est inchangé.
  const requestFetch = useRequestFetch() as unknown as ApiFetch
  const rawFetch = $fetch as unknown as ApiFetch

  function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const base = resolveApiBase(path, backendBaseUrl, migratedPrefixes)

    if (!base) {
      // Domaine non migré → API Nitro, même origine. `requestFetch` conserve le
      // forwarding du cookie de session en SSR (comportement actuel identique).
      return requestFetch<T>(path, options)
    }

    // Domaine migré → backend Express (cross-origin). Le cookie de session est
    // transmis via `credentials`. Le repli Bearer (auth desktop/mobile) sera
    // ajouté ici quand la couche auth du backend sera posée (Phase 2).
    return rawFetch<T>(path, { baseURL: base, credentials: 'include', ...options })
  }

  return { apiFetch }
}
