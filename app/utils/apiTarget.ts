/**
 * Point de bascule (« strangler-fig ») entre l'API interne Nitro et le backend
 * Express externe, décidé PAR CHEMIN — voir docs/adr (extraction backend).
 *
 * Principe : par défaut, tout part vers l'API Nitro (chemin relatif, même
 * origine) — comportement actuel, aucun changement. Quand un domaine est porté
 * vers le backend, on ajoute son préfixe à `NUXT_PUBLIC_MIGRATED_API_PREFIXES`
 * et on renseigne `NUXT_PUBLIC_BACKEND_BASE_URL` : seuls les chemins de ce
 * domaine basculent, le reste continue sur Nitro. Retirer le préfixe = retour
 * immédiat à Nitro (rollback sans redéploiement).
 */

/** Découpe la liste CSV des préfixes migrés en tableau nettoyé. */
export function parseMigratedPrefixes(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((prefix) => prefix.trim())
    .filter(Boolean)
}

/**
 * Vrai si `path` appartient à un domaine migré. La comparaison se fait à la
 * frontière de segment pour éviter les faux positifs (`/api/wallet` ne doit pas
 * capter `/api/wallet-export`).
 */
export function isMigratedPath(path: string, migratedPrefixes: string[]): boolean {
  return migratedPrefixes.some((prefix) => {
    const normalized = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
    return path === normalized || path.startsWith(`${normalized}/`)
  })
}

/**
 * Base à utiliser pour un chemin donné : `''` = API Nitro (relatif, même
 * origine) ; l'URL du backend si le domaine est migré ET le backend configuré.
 */
export function resolveApiBase(
  path: string,
  backendBaseUrl: string,
  migratedPrefixes: string[],
): string {
  if (!backendBaseUrl) return ''
  if (!isMigratedPath(path, migratedPrefixes)) return ''
  return backendBaseUrl.endsWith('/') ? backendBaseUrl.slice(0, -1) : backendBaseUrl
}
