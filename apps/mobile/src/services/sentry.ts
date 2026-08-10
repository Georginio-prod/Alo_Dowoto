import Constants from 'expo-constants'
import * as Sentry from '@sentry/react-native'

/**
 * Suivi des erreurs. Reste inerte tant qu'aucun DSN n'est fourni
 * (EXPO_PUBLIC_SENTRY_DSN) — comme le plugin errorReporting du web. Aucune
 * donnée personnelle envoyée (Phase 3).
 */
const dsn = (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ?? ''

export function initErrorTracking() {
  if (!dsn) return
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  })
}

export function captureError(error: unknown) {
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.error(error)
    return
  }
  Sentry.captureException(error)
}
