import { env } from '../config/env'
import { badGateway, notFound, serverError } from '../utils/apiError'

/**
 * Relais des mises à jour du dashboard admin desktop (Electron), porté iso depuis
 * `server/api/updates/[...file].get.ts` (ADR-0016).
 *
 * Les postes clients ne portent AUCUN jeton GitHub : ils interrogent ce relais
 * public (provider `generic` d'electron-updater) qui sert les assets de la
 * dernière release publiée sur le dépôt PRIVÉ GitHub. Le seul jeton (lecture
 * seule) vit côté serveur (`env.githubUpdateToken`). Le point d'entrée est
 * volontairement public : l'installeur seul ne donne aucun accès (toute action
 * exige ensuite une session admin) et l'auto-update doit fonctionner avant même
 * la connexion.
 *
 * Adaptations runtime (zéro changement fonctionnel) : `$fetch` → `fetch` global,
 * et la lecture de config passe par `env` (au lieu de `useRuntimeConfig`). Le
 * streaming de l'octet-stream et le relais des en-têtes de plage restent côté
 * contrôleur (couche HTTP).
 */

export interface GhAsset {
  id: number
  name: string
  size: number
}
export interface GhRelease {
  tag_name: string
  assets: GhAsset[]
}

/** TTL du cache mémoire de la dernière release (évite un appel GitHub par morceau). */
const CACHE_TTL = 60_000

export interface UpdatesConfig {
  token: string
  repo: string
  /** Injectable pour les tests (aucun appel réseau réel). */
  fetchImpl: typeof fetch
}

export function createUpdatesService(config: Partial<UpdatesConfig> = {}) {
  const token = config.token ?? env.githubUpdateToken
  const repo = config.repo ?? env.githubUpdateRepo
  const fetchImpl = config.fetchImpl ?? fetch

  // Cache par instance : évite un appel à l'API GitHub à chaque morceau lors
  // d'un téléchargement différentiel (nombreuses requêtes Range).
  let cache: { at: number; release: GhRelease } | null = null

  /** Dernière release publiée (mise en cache). Lève 500 (non configuré) ou 502 (GitHub injoignable). */
  async function getLatestRelease(): Promise<GhRelease> {
    if (!token) {
      serverError('Relais de mise à jour non configuré (NUXT_GITHUB_UPDATE_TOKEN manquant).')
    }
    if (cache && Date.now() - cache.at < CACHE_TTL) return cache.release

    try {
      const response = await fetchImpl(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'worktogo-admin-updater',
        },
      })
      if (!response.ok) throw new Error(`GitHub ${response.status}`)
      const release = (await response.json()) as GhRelease
      cache = { at: Date.now(), release }
      return release
    } catch (e) {
      badGateway(`Release GitHub inaccessible : ${(e as Error)?.message || e}`)
    }
  }

  /** Asset de la release correspondant au fichier demandé, ou 404. */
  function findAsset(release: GhRelease, file: string): GhAsset {
    const asset = release.assets.find((a) => a.name === file)
    if (!asset) notFound(`Fichier de mise à jour introuvable : ${file}`)
    return asset
  }

  /**
   * Ouvre le flux d'un asset via l'API GitHub (redirection signée vers le CDN,
   * suivie par `fetch` — qui retire l'en-tête `Authorization` sur la redirection
   * cross-origin, dont le CDN n'a pas besoin). L'en-tête `Range` est propagé
   * pour le téléchargement différentiel. Lève 502 si GitHub refuse.
   */
  async function openAsset(assetId: number, range: string | undefined, file: string): Promise<Response> {
    const upstream = await fetchImpl(`https://api.github.com/repos/${repo}/releases/assets/${assetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/octet-stream',
        'User-Agent': 'worktogo-admin-updater',
        ...(range ? { Range: range } : {}),
      },
    })
    if (!upstream.ok && upstream.status !== 206) {
      badGateway(`Téléchargement de ${file} impossible (GitHub ${upstream.status}).`)
    }
    return upstream
  }

  return { getLatestRelease, findAsset, openAsset }
}

/** Instance par défaut, liée à la configuration d'environnement. */
export const updatesService = createUpdatesService()
