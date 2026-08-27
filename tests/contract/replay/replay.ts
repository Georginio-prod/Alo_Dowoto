import { expect } from 'vitest'

/**
 * Cœur du **runner de rejeu de contrat** (ADR-0016). Un scénario est une requête
 * HTTP ; le runner l'envoie **à l'identique** au serveur Nitro (référence) ET au
 * backend Express (portage), puis compare statut + corps. S'ils diffèrent après
 * normalisation des champs volatils, le portage n'est pas iso-fonctionnel.
 *
 * Générique et réutilisable domaine par domaine : chaque test de domaine fournit
 * ses scénarios (méthode + chemin + corps) et, au besoin, un normaliseur pour les
 * champs non déterministes (ids générés, horodatages) — voir `normalize.ts`.
 */
export interface ReplayRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Chemin identique côté Nitro et Express, ex. `/api/testimonials`. */
  path: string
  query?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
}

export interface CapturedResponse {
  status: number
  body: unknown
}

function buildUrl(base: string, path: string, query?: Record<string, string>): string {
  const url = new URL(path, base)
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return url.toString()
}

/** Envoie une requête à un serveur et capture statut + corps (JSON si possible). */
export async function callServer(base: string, req: ReplayRequest): Promise<CapturedResponse> {
  const method = req.method ?? 'GET'
  const hasBody = req.body !== undefined && method !== 'GET'
  const res = await fetch(buildUrl(base, req.path, req.query), {
    method,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...req.headers,
    },
    body: hasBody ? JSON.stringify(req.body) : undefined,
  })
  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, body }
}

export type Normalizer = (res: CapturedResponse) => CapturedResponse

export interface ReplayTargets {
  nitroUrl: string
  expressUrl: string
}

/**
 * Rejoue une requête contre les deux runtimes et **affirme l'iso-fonctionnement**
 * (statut + corps égaux après normalisation). Renvoie les deux réponses brutes
 * pour d'éventuelles assertions supplémentaires propres au scénario.
 */
export async function expectIso(
  targets: ReplayTargets,
  req: ReplayRequest,
  normalize: Normalizer = (r) => r,
): Promise<{ nitro: CapturedResponse; express: CapturedResponse }> {
  const [nitro, express] = await Promise.all([
    callServer(targets.nitroUrl, req),
    callServer(targets.expressUrl, req),
  ])

  expect(
    normalize(express),
    `Divergence de contrat sur ${req.method ?? 'GET'} ${req.path} (Express ≠ Nitro)`,
  ).toEqual(normalize(nitro))

  return { nitro, express }
}
