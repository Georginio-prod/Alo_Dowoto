import React, { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins'
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
  // Police Poppins : on ATTEND son chargement avant de rendre l'UI. Sur
  // Android, un texte avec une fontFamily custom non encore chargée s'affiche
  // vide (invisible) — d'où des écrans « vides ». On rend quand même en cas
  // d'erreur (repli police système) pour ne jamais rester bloqué.
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  })

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

  // Tant que la police n'est pas prête (et sans erreur), on affiche un écran de
  // chargement neutre — évite le texte invisible sur Android.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F7' }}>
        <ActivityIndicator color="#14A800" />
      </View>
    )
  }

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
