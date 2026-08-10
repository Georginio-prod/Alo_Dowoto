import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

/**
 * Client TanStack Query partagé. Le cache reste consultable hors-ligne
 * (gcTime long) ; on ne réessaie jamais une 4xx (Phase 3).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // 24 h : données consultables hors réseau
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError) return false // pas de rejeu automatique des mutations 4xx
        return failureCount < 1
      },
    },
  },
})
