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
    // minSdkVersion (Android 8.0 / API 26) est fixé via expo-build-properties
    // ci-dessous — ce n'est pas une clé directe du bloc `android`.
    // Clé Google Maps optionnelle : la vue carte utilise les tuiles
    // OpenStreetMap (UrlTile) et fonctionne SANS clé. Renseigner
    // EXPO_PUBLIC_GMAPS_KEY améliore le fond de carte natif.
    config: {
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GMAPS_KEY ?? '' },
    },
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
    // usesCleartextTraffic : autorise l'app à joindre le backend en HTTP (dev
    // sur IP LAN, ex. http://192.168.x.x:3000). Sinon Android 9+ bloque le
    // trafic non chiffré. En production, le backend passe en HTTPS.
    ['expo-build-properties', { android: { minSdkVersion: 26, usesCleartextTraffic: true } }],
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
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    router: { origin: false },
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
})
