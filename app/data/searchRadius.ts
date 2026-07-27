/**
 * Paliers du curseur de rayon de recherche (#geoloc, 1.3), en donnée de
 * configuration partagée entre le client (curseur de `/resultats`) et le
 * serveur (`server/utils/providerDirectory.ts#searchProvidersNearby`, mêmes
 * paliers utilisés pour l'élargissement automatique) — un seul et même
 * fichier, plutôt qu'une constante dupliquée de chaque côté qui risquerait
 * de diverger.
 */
export const RADIUS_SLIDER_OPTIONS_KM = [1, 2, 5, 10, 20, 50]

/** Rayon par défaut d'une recherche de proximité tant que l'utilisateur n'a pas ajusté le curseur. */
export const DEFAULT_RADIUS_KM = 5
