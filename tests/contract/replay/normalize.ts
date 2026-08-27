import type { CapturedResponse, Normalizer } from './replay'

/**
 * Normaliseurs de champs **non déterministes**, appliqués aux deux réponses
 * avant comparaison. Ils ne masquent que ce qui ne peut pas être iso par nature
 * (horodatages relatifs au démarrage, ids/dates générés à l'écriture), jamais un
 * écart de comportement réel — celui-ci doit continuer de faire échouer le rejeu.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** Compose plusieurs normaliseurs de gauche à droite. */
export function compose(...fns: Normalizer[]): Normalizer {
  return (res) => fns.reduce((acc, fn) => fn(acc), res)
}

/**
 * Neutralise le `createdAt` des avis d'**exemple** (id `seed-*`) : il vaut
 * `Date.now() - N jours` évalué au chargement du module, donc diffère de quelques
 * ms entre le process Nitro et le process Express (imports à des instants
 * distincts). L'ordre relatif, lui, reste iso et n'est pas touché.
 */
export function normalizeSeedTimestamps(field = 'testimonials'): Normalizer {
  return (res) => {
    if (!isRecord(res.body) || !Array.isArray(res.body[field])) return res
    const items = (res.body[field] as unknown[]).map((item) => {
      if (isRecord(item) && typeof item.id === 'string' && item.id.startsWith('seed-')) {
        return { ...item, createdAt: 0 }
      }
      return item
    })
    return { status: res.status, body: { ...res.body, [field]: items } }
  }
}

/**
 * Remplace des champs générés à l'écriture (id, createdAt…) par une constante,
 * à un chemin `parent.child` donné. Pour les scénarios de **création** rejoués
 * des deux côtés : deux lignes distinctes sont créées (ids/dates différents),
 * seul le reste de la forme doit être iso.
 */
export function stripGenerated(parentKey: string, fields: string[]): Normalizer {
  return (res) => {
    if (!isRecord(res.body) || !isRecord(res.body[parentKey])) return res
    const parent = { ...(res.body[parentKey] as Record<string, unknown>) }
    for (const f of fields) if (f in parent) parent[f] = '<généré>'
    return { status: res.status, body: { ...res.body, [parentKey]: parent } }
  }
}

/**
 * Remplace des champs générés **au niveau racine** du corps (ex. `reference`,
 * dérivée de l'id créé) par une constante. Pour les scénarios de création dont
 * la réponse n'imbrique pas l'entité : deux appels créent deux lignes, seule la
 * forme doit être iso.
 */
export function stripTopLevel(fields: string[]): Normalizer {
  return (res) => {
    if (!isRecord(res.body)) return res
    const body = { ...res.body }
    for (const f of fields) if (f in body) body[f] = '<généré>'
    return { status: res.status, body }
  }
}

/**
 * Projette une réponse d'erreur sur le sous-ensemble **déterministe et observé
 * par les clients** — `{ error, statusCode, message, data? }` — en écartant les
 * champs bruités de l'enveloppe Nitro : `url` (contient l'hôte/port du serveur,
 * non déterministe) et `statusMessage` (ligne de statut assainie par h3, jamais
 * lue côté front, cf. `server/utils/apiError.ts`). Même esprit que le contrat
 * qui ne fige pas les en-têtes (`tests/contract/README.md`). Sans effet sur une
 * réponse de succès.
 */
export function normalizeErrorEnvelope(): Normalizer {
  return (res) => {
    if (!isRecord(res.body) || res.body.error !== true) return res
    const b = res.body
    const projected: Record<string, unknown> = {
      error: true,
      statusCode: b.statusCode,
      message: b.message,
    }
    if (b.data !== undefined) projected.data = b.data
    return { status: res.status, body: projected }
  }
}

/** Identité — pour les réponses déjà déterministes. */
export const identity: Normalizer = (res: CapturedResponse) => res
