import { create } from 'zustand'
import { secureStorage } from '@/services/storage'
import type { User } from './types'

/**
 * État d'interface de session (Zustand). La source de vérité réseau reste
 * TanStack Query (voir hooks.ts) ; ce store ne garde que l'utilisateur courant
 * et le statut de chargement, partagés hors du cache réseau (garde de route).
 */
interface SessionState {
  user: User | null
  loaded: boolean
  setUser: (user: User | null) => void
  setLoaded: (loaded: boolean) => void
  signOut: () => Promise<void>
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  loaded: false,
  setUser: (user) => set({ user, loaded: true }),
  setLoaded: (loaded) => set({ loaded }),
  signOut: async () => {
    await secureStorage.clearToken()
    set({ user: null, loaded: true })
  },
}))
