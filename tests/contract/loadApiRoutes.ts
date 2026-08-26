import type { EventHandler } from 'h3'

/**
 * Découverte automatique des routes `server/api/**` — socle du harnais de tests
 * de contrat (Phase 0 du chantier d'extraction backend, ADR-0016).
 *
 * Objectif : figer la **surface HTTP actuelle** (Nitro) et son comportement
 * AVANT toute extraction vers Express, puis rejouer exactement les mêmes
 * requêtes contre le futur backend pour prouver l'iso-fonctionnement
 * (« zéro changement fonctionnel » pour le web, le mobile et le dashboard).
 *
 * On s'appuie sur `import.meta.glob` (Vite/Vitest) plutôt que sur un listing
 * manuel : aucune route ne peut être oubliée, et une route ajoutée/retirée
 * fait bouger l'instantané d'inventaire (voir routeInventory.contract.test.ts).
 */

export type HttpMethod = 'get' | 'post' | 'patch' | 'delete'

export interface ApiRoute {
  method: HttpMethod
  /** Chemin monté sur le routeur h3 (`:param`, `**` pour le catch-all). */
  routePath: string
  /** Clé de glob du fichier source, pour diagnostic. */
  file: string
  /** Charge paresseusement le handler par défaut du fichier. */
  load: () => Promise<EventHandler>
}

type HandlerModule = { default: EventHandler }

// Motif littéral requis par import.meta.glob (analyse statique de Vite).
const modules = import.meta.glob('/server/api/**/*.{get,post,patch,delete}.ts') as Record<
  string,
  () => Promise<HandlerModule>
>

const METHOD_RE = /\.(get|post|patch|delete)\.ts$/

/**
 * Convertit un chemin de fichier Nitro en route h3.
 * `server/api/admin/users/[id].get.ts`   → GET  /api/admin/users/:id
 * `server/api/sectors/index.get.ts`      → GET  /api/sectors
 * `server/api/updates/[...file].get.ts`  → GET  /api/updates/**
 */
function fileToRoute(file: string, loader: () => Promise<HandlerModule>): ApiRoute | null {
  const methodMatch = METHOD_RE.exec(file)
  if (!methodMatch) return null
  const method = methodMatch[1] as HttpMethod

  const base = file.replace(/^\/server\/api\//, '').replace(METHOD_RE, '')
  const segments = base.split('/')
  if (segments[segments.length - 1] === 'index') segments.pop()

  const h3 = segments.map((seg) => {
    if (seg.startsWith('[...')) return '**'
    if (seg.startsWith('[') && seg.endsWith(']')) return `:${seg.slice(1, -1)}`
    return seg
  })

  const routePath = h3.length ? `/api/${h3.join('/')}` : '/api'
  return { method, routePath, file, load: async () => (await loader()).default }
}

/** Toutes les routes découvertes, triées de façon déterministe. */
export function discoverApiRoutes(): ApiRoute[] {
  const routes: ApiRoute[] = []
  for (const [file, loader] of Object.entries(modules)) {
    const route = fileToRoute(file, loader)
    if (route) routes.push(route)
  }
  return routes.sort((a, b) =>
    `${a.routePath} ${a.method}`.localeCompare(`${b.routePath} ${b.method}`),
  )
}
