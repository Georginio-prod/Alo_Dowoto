import * as Location from 'expo-location'

export interface Coords {
  latitude: number
  longitude: number
}

/**
 * Géolocalisation (Phase 3/4) : recherche géolocalisée, check-in prestataire,
 * suivi d'arrivée. Demande la permission puis renvoie la position, ou null si
 * refusée (l'app reste utilisable via ville en texte libre — cf. backend).
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return null
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
}

/** Distance à vol d'oiseau (km) — Haversine, pur et testable. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
