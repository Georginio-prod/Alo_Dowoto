import Constants from 'expo-constants'
import type { ZodType } from 'zod'
import { secureStorage } from './storage'

/**
 * Client HTTP UNIQUE (Phase 3). Aucune requête réseau ne doit être faite
 * ailleurs — tout passe par ces fonctions, appelées depuis les `api.ts` des
 * features, eux-mêmes enveloppés par des hooks TanStack Query.
 *
 * Auth : le backend Nuxt n'accepte QUE le cookie `wt_session` (voir
 * MIGRATION.md §4). On capture le `Set-Cookie` au login, on stocke le jeton en
 * SecureStore, et on le renvoie via l'en-tête `Cookie` à chaque requête —
 * React Native ne gère pas de cookie jar automatique.
 */

// EXPO_PUBLIC_API_URL est inliné par Metro au bundling (mécanisme officiel
// Expo, fiable y compris via le build Gradle) ; `extra.apiUrl` sert de repli.
const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3000'

const TIMEOUT_MS = 15_000
const MAX_RETRIES = 2 // uniquement erreurs réseau/5xx, jamais 4xx (Phase 3)

export class ApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message = 'network') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** Callback branché par le service auth : déconnexion propre sur 401. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export interface RequestOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /**
   * Schéma Zod validant la réponse — contrat typé (Phase 3). `ZodType<T, any,
   * any>` force l'inférence de T sur le type de SORTIE du schéma (valeurs par
   * défaut appliquées), pas l'entrée.
   */
  schema?: ZodType<T, any, any>
  /** Désactive le renvoi du cookie (endpoints publics). */
  anonymous?: boolean
  signal?: AbortSignal
}

async function buildHeaders(anonymous?: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (!anonymous) {
    const token = await secureStorage.getToken()
    if (token) headers.Cookie = `wt_session=${token}`
  }
  return headers
}

/** Extrait le jeton `wt_session` d'un en-tête Set-Cookie. */
export function extractSessionToken(setCookie: string | null): string | null {
  if (!setCookie) return null
  const match = /wt_session=([^;]+)/.exec(setCookie)
  return match?.[1] ?? null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(`${API_URL}${path}`, { ...init, signal: init.signal ?? controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Effectue une requête. Renvoie la réponse JSON validée par `schema` si fourni.
 * Réessaie avec délai croissant sur erreur réseau/5xx uniquement.
 */
// Avec `schema`, T est inféré sur le type de sortie du schéma ; sinon `unknown`.
export async function request<T = unknown>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  const { method = 'GET', body, schema, anonymous, signal } = opts
  const headers = await buildHeaders(anonymous)
  const init: RequestInit = {
    method,
    headers,
    signal,
    ...(body !== undefined ? { body: JSON.stringify(body) } : null),
  }

  let attempt = 0
  for (;;) {
    let res: Response
    try {
      res = await rawFetch(path, init)
    } catch (err) {
      // Erreur réseau (timeout/abort/DNS) : on réessaie.
      if (attempt < MAX_RETRIES) {
        attempt += 1
        await sleep(300 * 2 ** (attempt - 1))
        continue
      }
      throw new NetworkError(err instanceof Error ? err.message : undefined)
    }

    if (res.status === 401 && !anonymous) {
      onUnauthorized?.()
    }

    const text = await res.text()
    const payload = text ? safeJson(text) : null

    if (!res.ok) {
      // 5xx : réessayable. 4xx : jamais (Phase 3).
      if (res.status >= 500 && attempt < MAX_RETRIES) {
        attempt += 1
        await sleep(300 * 2 ** (attempt - 1))
        continue
      }
      throw new ApiError(res.status, payload, extractMessage(payload))
    }

    if (schema) {
      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        // Réponse inattendue → erreur claire, pas d'écran blanc (Phase 3).
        throw new ApiError(res.status, payload, 'Réponse serveur inattendue.')
      }
      return parsed.data as T
    }
    return payload as T
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractMessage(payload: unknown): string | undefined {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>
    // `message` porte le texte utile (createError de h3) ; `statusMessage` est
    // souvent générique ("Server Error"). On privilégie donc `message`.
    if (typeof p.message === 'string' && p.message.trim()) return p.message
    if (typeof p.statusMessage === 'string') return p.statusMessage
  }
  return undefined
}

/** Login à part : besoin de lire l'en-tête Set-Cookie de la réponse. */
export async function requestWithSession<T = unknown>(
  path: string,
  opts: RequestOptions<T> = {},
): Promise<{ data: T; token: string | null }> {
  const { method = 'POST', body, schema, anonymous } = opts
  const headers = await buildHeaders(anonymous)
  const res = await rawFetch(path, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : null),
  })
  const text = await res.text()
  const payload = text ? safeJson(text) : null
  if (!res.ok) throw new ApiError(res.status, payload, extractMessage(payload))
  const token = extractSessionToken(res.headers.get('set-cookie'))
  const data = (schema ? schema.parse(payload) : payload) as T
  return { data, token }
}

export { API_URL }
