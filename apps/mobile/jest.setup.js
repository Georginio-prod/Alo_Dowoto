/* Mocks natifs pour l'environnement de test Node (jest-expo). */

// AsyncStorage : mock officiel (sinon le module natif échoue à charger).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

// expo-secure-store : implémentation en mémoire pour les tests.
jest.mock('expo-secure-store', () => {
  const store = new Map()
  return {
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      store.set(k, v)
    }),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k)
    }),
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  }
})
