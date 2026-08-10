import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Deux niveaux de stockage :
 * - **SecureStore** (chiffré) : jeton de session `wt_session`. Jamais en clair.
 * - **AsyncStorage** : cache TanStack Query, préférences, file d'attente
 *   hors-ligne. Rien de sensible.
 */

const SESSION_KEY = 'wt_session'

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SESSION_KEY)
    } catch {
      return null
    }
  },
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    })
  },
  async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY)
    } catch {
      /* déjà absent */
    }
  },
}

export const cacheStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
}
