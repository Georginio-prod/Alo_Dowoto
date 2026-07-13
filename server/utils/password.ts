import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Hachage de mot de passe via scrypt (module natif Node, pas de dépendance
 * supplémentaire). Suffisant pour ce lot (#125) — à remplacer par la même
 * primitive côté base de données le jour où #45/#46 sont faites.
 */

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) return false
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  if (derivedKey.length !== keyBuffer.length) return false
  return timingSafeEqual(derivedKey, keyBuffer)
}

export interface PasswordStrength {
  ok: boolean
  reasons: string[]
}

/**
 * Règles de robustesse imposées à la création (#125) : au moins 8
 * caractères, une majuscule, un chiffre, un caractère spécial.
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const reasons: string[] = []
  if (password.length < 8) reasons.push('8 caractères minimum')
  if (!/[A-Z]/.test(password)) reasons.push('une majuscule')
  if (!/\d/.test(password)) reasons.push('un chiffre')
  if (!/[^A-Za-z0-9]/.test(password)) reasons.push('un caractère spécial')
  return { ok: reasons.length === 0, reasons }
}
