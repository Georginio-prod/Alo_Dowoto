import * as Sentry from '@sentry/node'

/**
 * Instrumentation d'erreurs en production (#262) : aucune visibilité
 * n'existait jusqu'ici sur les exceptions non gérées côté serveur — un bug
 * en production sur un chemin de paiement/séquestre devait être découvert
 * par un utilisateur qui se plaint, pas détecté en quelques minutes.
 *
 * Entièrement inerte tant que `SENTRY_DSN` n'est pas défini (aucun appel
 * réseau, aucune dépendance à un compte externe) : la création du compte
 * fournisseur (Sentry ou équivalent auto-hébergé type GlitchTip) et la
 * vérification en environnement réel restent un choix produit/infra hors
 * périmètre de ce correctif — voir docs/decisions/0007-instrumentation-erreurs-production.md.
 */

/** Champs jamais transmis au fournisseur, quel que soit leur emplacement dans l'événement (corps de requête, extra, breadcrumbs). */
const SENSITIVE_FIELD_NAMES = new Set([
  'contact', 'phone', 'telephone', 'idcardimage', 'passportphotoimage',
  'password', 'passwordhash', 'token', 'secret', 'operatorref',
])

/** Numéro de téléphone togolais/international (ex. +228 90 12 34 56, 22890123456…). */
const PHONE_PATTERN = /(?:\+?\d[\d\s.-]{6,}\d)/g

function redactString(value: string): string {
  return value.replace(PHONE_PATTERN, '[redacted-phone]')
}

/**
 * Retire récursivement les champs sensibles d'un objet quelconque (corps de
 * requête, contexte additionnel) avant envoi — le nom du champ fait foi
 * (insensible à la casse), pas son contenu, pour rester simple et prévisible.
 */
export function scrubSensitiveData<T>(value: T): T {
  if (typeof value === 'string') return redactString(value) as T
  if (Array.isArray(value)) return value.map((item) => scrubSensitiveData(item)) as T
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_FIELD_NAMES.has(key.toLowerCase()) ? '[redacted]' : scrubSensitiveData(entry)
    }
    return result as T
  }
  return value
}

export function isErrorReportingEnabled(): boolean {
  return !!process.env.SENTRY_DSN
}

let initialized = false

/** Idempotent : n'initialise le SDK qu'une fois, et seulement si un DSN est configuré. */
export function initServerErrorReporting(): void {
  if (initialized || !isErrorReportingEnabled()) return
  initialized = true

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    beforeSend: (event) => scrubSensitiveData(event),
  })
}

/** Capture une exception serveur non gérée. No-op silencieux si l'instrumentation n'est pas activée. */
export function captureServerError(error: unknown, context?: Record<string, unknown>): void {
  if (!isErrorReportingEnabled()) return
  Sentry.captureException(error, context ? { extra: scrubSensitiveData(context) } : undefined)
}
