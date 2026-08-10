import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useSessionStore } from '@/features/auth/store'
import { useTheme } from '@/design-system'

/**
 * Point d'entrée : redirige selon la session amorcée dans _layout.
 * - non connecté → onboarding
 * - client → parcours chercheur
 * - prestataire → parcours prestataire
 */
export default function Index() {
  const { user, loaded } = useSessionStore()
  const theme = useTheme()

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    )
  }
  if (!user) return <Redirect href="/(auth)/welcome" />
  return <Redirect href={user.role === 'prestataire' ? '/(prestataire)' : '/(chercheur)'} />
}
