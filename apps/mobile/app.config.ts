import type { ExpoConfig, ConfigContext } from 'expo/config'

/**
 * Configuration Expo pilotée par l'environnement (.env / EAS).
 * Le backend Nuxt reste inchangé : l'app pointe vers son API via
 * EXPO_PUBLIC_API_URL (défaut = poste de dev sur le port 3001 du site).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'WorkTogo',
  slug: 'worktogo-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'worktogo', // liens profonds worktogo://
  userInterfaceStyle: 'automatic',
  newArchEnabled: true, // nouveau moteur de rendu (Fabric) — gain sur appareils faibles
  icon: './assets/images/icon.png',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#14A800',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.worktogo.mobile',
    associatedDomains: ['applinks:worktogo.tg'],
  },
  android: {
    package: 'com.worktogo.mobile',
    minSdkVersion: 26, // Android 8.0
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#14A800',
    },
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'CAMERA'],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'worktogo.tg', pathPrefix: '/m' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'WorkTogo utilise votre position pour trouver des prestataires proches et suivre les missions.',
      },
    ],
    [
      'expo-image-picker',
      { photosPermission: 'WorkTogo accède à vos photos pour illustrer votre demande.' },
    ],
    ['expo-notifications', {}],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    router: { origin: false },
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
})
