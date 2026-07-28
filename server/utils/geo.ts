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

export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/**
 * Rectangle lat/lng englobant un rayon donné autour d'un point (#geoloc) : à
 * utiliser en pré-filtrage avant le calcul Haversine exact (évite de calculer
 * la distance précise pour chaque ligne d'une table qui grossira avec de
 * vrais comptes prestataires). Approximation volontairement large (1° de
 * latitude ≈ 111 km, corrigée par le cosinus de la latitude pour la
 * longitude) : elle ne doit jamais exclure un point réellement dans le
 * rayon, seulement réduire le nombre de candidats à vérifier précisément.
 */
export function boundingBoxAround(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos(toRadians(center.latitude)) || 1)
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  }
}

export function isWithinBoundingBox(point: Coordinates, box: BoundingBox): boolean {
  return point.latitude >= box.minLat && point.latitude <= box.maxLat
    && point.longitude >= box.minLng && point.longitude <= box.maxLng
}

/**
 * Floute des coordonnées pour l'affichage public (#geoloc, vie privée) : un
 * prestataire en position approximative ne doit jamais exposer son point
 * exact (domicile) dans les réponses API. Arrondi à 2 décimales ≈ une marge
 * de quelques centaines de mètres — suffisant pour situer un quartier sans
 * révéler l'adresse précise. Décalage déterministe (pas aléatoire) : recalculé
 * à chaque appel à partir des mêmes coordonnées, donc stable d'une requête à
 * l'autre (pas de « saut » du marqueur sur la carte au fil des rafraîchissements).
 */
export function fuzzCoordinate(point: Coordinates): Coordinates {
  const PRECISION = 100 // 2 décimales
  return {
    latitude: Math.round(point.latitude * PRECISION) / PRECISION,
    longitude: Math.round(point.longitude * PRECISION) / PRECISION,
  }
}
