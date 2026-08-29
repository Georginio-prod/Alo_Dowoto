import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * TOTP (RFC 6238) pour la double authentification des comptes admin
 * (#dashboard-admin, audit D-02). Implémentation minimale et sans dépendance
 * externe (HMAC-SHA1, pas 30 s, 6 chiffres — les réglages par défaut de Google
 * Authenticator / Authy / FreeOTP), volontairement limitée à ce dont
 * l'authentification admin a besoin : générer un secret à l'enrôlement, et
 * vérifier un code à la connexion.
 *
 * La MFA est OPT-IN : elle ne s'applique qu'aux comptes admin dont un secret a
 * été provisionné (voir scripts/enable-admin-totp.mjs). Un admin sans secret se
 * connecte comme avant — le déploiement du correctif ne casse aucune connexion
 * existante.
 */

const DIGITS = 6
const PERIOD_SECONDS = 30
/** Fenêtre de tolérance à la dérive d'horloge : le pas courant et le pas précédent/suivant. */
const DRIFT_STEPS = 1

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Encode des octets en base32 (RFC 4648, sans remplissage) — format attendu par les apps d'authentification. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

/** Décode une chaîne base32 (insensible à la casse, espaces et remplissage `=` tolérés). `null` si un caractère est invalide. */
export function base32Decode(input: string): Buffer | null {
  const clean = input.replace(/=+$/,'').replace(/\s+/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) return null
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Génère un secret TOTP aléatoire (20 octets = 160 bits, recommandation RFC 4226) encodé en base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/** Calcule le code TOTP à 6 chiffres pour un pas de compteur donné. */
function computeCode(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  // Compteur 64 bits big-endian (les entiers JS ne dépassent pas 2^53 : la
  // moitié haute reste à 0 jusqu'à l'an ~10889, sans conséquence pratique).
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = createHmac('sha1', secret).update(buf).digest()
  // Troncature dynamique (RFC 4226) via les lecteurs typés de Buffer
  // (readUInt8/readUInt32BE renvoient un `number`, pas `number | undefined`) :
  // `readUInt32BE(offset) & 0x7fffffff` équivaut exactement à assembler les 4
  // octets à partir de `offset` en masquant le bit de poids fort.
  const offset = hmac.readUInt8(hmac.length - 1) & 0x0f
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

/**
 * Vérifie un code TOTP saisi contre un secret base32, en tolérant une dérive
 * d'horloge de ±1 pas. Comparaison à temps constant. `false` si le secret est
 * illisible ou le code malformé.
 */
export function verifyTotp(secretBase32: string, code: string, atMs: number = Date.now()): boolean {
  const normalized = (code ?? '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return false
  const secret = base32Decode(secretBase32)
  if (!secret || secret.length === 0) return false

  const currentStep = Math.floor(atMs / 1000 / PERIOD_SECONDS)
  for (let offset = -DRIFT_STEPS; offset <= DRIFT_STEPS; offset++) {
    const expected = computeCode(secret, currentStep + offset)
    const a = Buffer.from(expected)
    const b = Buffer.from(normalized)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

/** Construit l'URI `otpauth://` à présenter (QR code) lors de l'enrôlement d'un admin. */
export function buildOtpAuthUri(secretBase32: string, accountLabel: string, issuer = 'WorkTogo'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`)
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
