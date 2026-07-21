/**
 * Calcul de distance entre deux points GPS (#263, « Prestataires près de
 * vous »). Formule de Haversine — précision suffisante à l'échelle d'une
 * recherche par ville/quartier, aucune dépendance externe nécessaire.
 */

const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export interface Coordinates {
  latitude: number
  longitude: number
}

/** Distance en kilomètres entre deux points GPS, arrondie au dixième. */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLng = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  const distance = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))

  return Math.round(distance * 10) / 10
}
