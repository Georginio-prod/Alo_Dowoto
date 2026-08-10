import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { ErrorState, ThemeProvider } from '@/design-system'
import { captureError } from '@/services/sentry'

/**
 * Barrière d'erreur globale (Phase 3) : un plantage affiche un écran de
 * récupération avec « Réessayer », jamais un écran blanc. L'erreur part vers
 * Sentry. Exportée comme `ErrorBoundary` d'expo-router (voir app/_layout.tsx).
 */
export function AppErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  React.useEffect(() => {
    captureError(error)
  }, [error])

  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <ErrorState
          message={error.message || 'Une erreur inattendue est survenue.'}
          onRetry={() => {
            void retry().catch(() => router.replace('/'))
          }}
        />
      </View>
    </ThemeProvider>
  )
}
