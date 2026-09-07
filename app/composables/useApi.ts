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
  return { apiFetch }
}

/**
 * Point d'entrée unique des appels HTTP du navigateur.
 *
 * Les composants peuvent l'obtenir via `useApi()`. Le garder exporté séparément
 * évite de recréer une fonction pour chaque composant tout en restant facile à
 * remplacer ou à enrichir (instrumentation, traduction d'erreurs) plus tard.
 */
export function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const rawFetch = $fetch as unknown as ApiFetch
  return rawFetch<T>(path, { ...options, credentials: 'include' })
}
