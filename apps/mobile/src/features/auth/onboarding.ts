import { create } from 'zustand'
import type { ContactMethod, Role } from './types'

/** État transitoire du parcours d'inscription (rôle → contact → code → mot de passe). */
interface OnboardingState {
  role: Role
  method: ContactMethod
  value: string
  referralCode: string
  firstName: string
  lastName: string
  location: string
  set: (patch: Partial<Omit<OnboardingState, 'set' | 'reset'>>) => void
  reset: () => void
}

const initial = {
  role: 'client' as Role,
  method: 'sms' as ContactMethod,
  value: '',
  referralCode: '',
  firstName: '',
  lastName: '',
  location: '',
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}))
