import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { secureStorage } from '@/services/storage'
import {
  createSession,
  destroySession,
  fetchSession,
  sendOtp,
  setPassword,
  updateProfile,
  verifyOtp,
} from './api'
import { useSessionStore } from './store'
import type { RegisterPayload, User } from './types'

/** Hooks TanStack Query pour l'auth — aucun appel réseau hors d'ici. */

export function useSession() {
  const setUser = useSessionStore((s) => s.setUser)
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const user = await fetchSession()
      setUser(user)
      return user
    },
    staleTime: 60_000,
  })
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (v: { method: 'phone' | 'email'; value: string }) => sendOtp(v.method, v.value),
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (v: { method: 'phone' | 'email'; value: string; code: string }) =>
      verifyOtp(v.method, v.value, v.code),
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  const setUser = useSessionStore((s) => s.setUser)
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { user, token } = await createSession(payload)
      if (token) await secureStorage.setToken(token)
      return user
    },
    onSuccess: (user) => {
      setUser(user)
      qc.setQueryData(['session'], user)
    },
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  const signOut = useSessionStore((s) => s.signOut)
  return useMutation({
    mutationFn: async () => {
      try {
        await destroySession()
      } finally {
        await signOut()
      }
    },
    onSuccess: () => qc.clear(),
  })
}

export function useSetPassword() {
  return useMutation({ mutationFn: (password: string) => setPassword(password) })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const setUser = useSessionStore((s) => s.setUser)
  return useMutation({
    mutationFn: (patch: Partial<User>) => updateProfile(patch),
    onSuccess: (user) => {
      setUser(user)
      qc.setQueryData(['session'], user)
    },
  })
}
