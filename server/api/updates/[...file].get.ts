/**
 * Relais de mises à jour du dashboard admin desktop (Electron).
 *
 * Les postes clients ne portent AUCUN jeton GitHub : ils interrogent ce point
 * d'entrée public (provider `generic` d'electron-updater, voir
 * dashboard-admin/electron/main.js) qui relaie les fichiers de la dernière
 * release publiée sur le dépôt PRIVÉ GitHub. Le seul jeton (lecture seule) vit
 * côté serveur, dans NUXT_GITHUB_UPDATE_TOKEN.
 *
 * Fichiers servis, dont les noms sont demandés par electron-updater :
 *   - `latest.yml`                       → métadonnées de version
 *   - `WorkTogo-Admin-Setup-x.y.z.exe`   → installeur
 *   - `WorkTogo-Admin-Setup-x.y.z.exe.blockmap` → téléchargement différentiel
 *
 * L'en-tête `Range` est relayé tel quel pour permettre le téléchargement
 * différentiel (blockmap) d'electron-updater. Point d'entrée volontairement
 * public : l'installeur seul ne donne aucun accès aux données (toute action
 * exige ensuite une session admin), et l'auto-update doit fonctionner avant
 * même la connexion.
 */

interface GhAsset {
  id: number
  name: string
  size: number
}
interface GhRelease {
  tag_name: string
  assets: GhAsset[]
}

// Cache mémoire de la dernière release : évite un appel à l'API GitHub à chaque
// morceau lors d'un téléchargement différentiel (nombreuses requêtes Range).
let cache: { at: number; release: GhRelease } | null = null
const CACHE_TTL = 60_000

async function getLatestRelease(repo: string, token: string): Promise<GhRelease> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.release
  const release = await $fetch<GhRelease>(
    `https://api.github.com/repos/${repo}/releases/latest`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'worktogo-admin-updater'
      }
    }
  )
  cache = { at: Date.now(), release }
  return release
}

export default defineEventHandler(async (event) => {
  const file = getRouterParam(event, 'file') || ''
  const cfg = useRuntimeConfig(event)
  const token = cfg.githubUpdateToken as string
  const repo = cfg.githubUpdateRepo as string

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Relais de mise à jour non configuré (NUXT_GITHUB_UPDATE_TOKEN manquant).'
    })
  }

  let release: GhRelease
  try {
    release = await getLatestRelease(repo, token)
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: `Release GitHub inaccessible : ${(e as Error)?.message || e}`
    })
  }

  const asset = release.assets.find((a) => a.name === file)
  if (!asset) {
    throw createError({ statusCode: 404, statusMessage: `Fichier de mise à jour introuvable : ${file}` })
  }

  // GitHub renvoie l'octet-stream de l'asset via une redirection signée vers son
  // CDN, suivie automatiquement par fetch (qui retire l'en-tête Authorization
  // sur la redirection cross-origin — le CDN n'en a pas besoin). L'en-tête Range
  // est propagé pour le téléchargement différentiel.
  const range = getHeader(event, 'range')
  const upstream = await fetch(
    `https://api.github.com/repos/${repo}/releases/assets/${asset.id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/octet-stream',
        'User-Agent': 'worktogo-admin-updater',
        ...(range ? { Range: range } : {})
      }
    }
  )

  if (!upstream.ok && upstream.status !== 206) {
    throw createError({
      statusCode: 502,
      statusMessage: `Téléchargement de ${file} impossible (GitHub ${upstream.status}).`
    })
  }

  const isYml = file.endsWith('.yml')
  const headers = new Headers()
  headers.set('Content-Type', isYml ? 'text/yaml; charset=utf-8' : 'application/octet-stream')
  // Reprend les en-têtes utiles au (re)téléchargement partiel côté updater.
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h)
    if (v) headers.set(h, v)
  }
  // Les métadonnées (latest.yml) doivent toujours être fraîches ; les binaires
  // sont immuables (nom versionné) mais inutiles à mettre en cache ici.
  headers.set('Cache-Control', 'no-store')

  return new Response(upstream.body, { status: upstream.status, headers })
})
