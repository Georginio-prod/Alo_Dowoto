import React, { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins'
import '@/i18n'
import { ThemeProvider } from '@/design-system'
import { queryClient } from '@/services/queryClient'
import { setUnauthorizedHandler } from '@/services/http'
import { initErrorTracking } from '@/services/sentry'
import { secureStorage } from '@/services/storage'
import { fetchSession } from '@/features/auth/api'
import { useSessionStore } from '@/features/auth/store'

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary'

/**
 * Racine : providers globaux (thème, réseau, gestes), amorçage de session
 * (jeton SecureStore → /api/auth/session) et garde d'authentification.
 */
export default function RootLayout() {
  const setUser = useSessionStore((s) => s.setUser)
  const setLoaded = useSessionStore((s) => s.setLoaded)
  // Police Poppins (parité web). On rend sans bloquer sur le chargement : le
  // repli système évite l'écran blanc sur réseau lent (les glyphes basculent
  // sur Poppins dès que la police est prête).
  useFonts({ Poppins_400Regular, Poppins_700Bold })

  useEffect(() => {
    initErrorTracking()
    // Déconnexion propre sur 401 (intercepteur HTTP → garde de route).
    setUnauthorizedHandler(() => {
      void secureStorage.clearToken()
      useSessionStore.getState().setUser(null)
      router.replace('/(auth)/welcome')
    })

    // Amorçage : si un jeton existe, on tente de restaurer la session.
    ;(async () => {
      const token = await secureStorage.getToken()
      if (!token) {
        setLoaded(true)
        return
      }
      try {
        const user = await fetchSession()
        setUser(user)
      } catch {
        setLoaded(true)
      }
    })()
  }, [setLoaded, setUser])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(chercheur)" />
              <Stack.Screen name="(prestataire)" />
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
