import type { FetchOptions } from 'ofetch'

/** Signature minimale de fetch, agnostique des routes typées de Nuxt. */
type ApiFetch = <T>(path: string, options?: FetchOptions) => Promise<T>

/**
 * Client API partagé du front. L'application est une SPA : chaque appel reste
 * relatif (`/api/**`) et le reverse proxy le transmet au backend Express. Les
 * cookies de session restent donc same-origin, sans URL backend exposée au
 * navigateur ni logique de bascule par domaine.
 */
export function useApi() {
  const rawFetch = $fetch as unknown as ApiFetch

  function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    return rawFetch<T>(path, { credentials: 'include', ...options })
  }

  return { apiFetch }
}
