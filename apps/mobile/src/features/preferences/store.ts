import { create } from 'zustand'

/**
 * Préférences d'interface (Phase 5) : mode économie de données (dégrade les
 * images, désactive les cartes) et langue. Persistées via AsyncStorage plus
 * tard ; ici en mémoire pour rester simple et testable.
 */
interface PreferencesState {
  dataSaver: boolean
  language: 'fr' | 'en'
  setDataSaver: (on: boolean) => void
  setLanguage: (lang: 'fr' | 'en') => void
}

export const usePreferences = create<PreferencesState>((set) => ({
  dataSaver: false,
  language: 'fr',
  setDataSaver: (dataSaver) => set({ dataSaver }),
  setLanguage: (language) => set({ language }),
}))
