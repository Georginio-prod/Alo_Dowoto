/**
 * Activation (ou désactivation) de la double authentification TOTP d'un compte
 * administrateur du dashboard desktop (audit D-02).
 *
 * La MFA admin est OPT-IN : tant qu'aucun secret n'est provisionné, la connexion
 * fonctionne comme avant. Ce script génère un secret, l'enregistre sur le compte
 * admin, puis affiche le secret et l'URI `otpauth://` à scanner dans une app
 * d'authentification (Google Authenticator, Authy, FreeOTP…). Au prochain login,
 * /api/admin/login exigera le code à six chiffres.
 *
 * Usage (depuis le dossier Alo_Dowoto) :
 *   node scripts/enable-admin-totp.mjs <email>            # active la MFA
 *   node scripts/enable-admin-totp.mjs <email> --disable  # désactive la MFA
 *
 * Le format du secret (base32, HMAC-SHA1, 6 chiffres, période 30 s) est
 * identique à celui vérifié par server/utils/totp.ts.
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Encode des octets en base32 (RFC 4648, sans remplissage) — miroir de server/utils/totp.ts. */
function base32Encode(buffer) {
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
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function buildOtpAuthUri(secret, accountLabel, issuer = 'WorkTogo') {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${label}?${params.toString()}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function main() {
  const args = process.argv.slice(2)
  const disable = args.includes('--disable')
  const rawEmail = args.find((a) => !a.startsWith('--'))

  if (!rawEmail) {
    console.error('Usage : node scripts/enable-admin-totp.mjs <email> [--disable]')
    process.exit(1)
  }
  const email = String(rawEmail).trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    console.error(`Email invalide : ${rawEmail}`)
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { contact: email } })
    if (!user || user.role !== 'admin') {
      console.error(`Aucun compte administrateur trouvé pour : ${email}`)
      console.error('Créez-le d’abord avec scripts/create-admin.mjs.')
      process.exit(1)
    }

    if (disable) {
      await prisma.user.update({ where: { contact: email }, data: { totpSecret: null } })
      console.log(`✓ Double authentification DÉSACTIVÉE pour ${email}.`)
      return
    }

    const secret = base32Encode(randomBytes(20))
    await prisma.user.update({ where: { contact: email }, data: { totpSecret: secret } })

    console.log('')
    console.log(`✓ Double authentification ACTIVÉE pour ${email}.`)
    console.log('')
    console.log('  Scannez cette URI (ou saisissez le secret) dans votre app d’authentification :')
    console.log('')
    console.log(`  Secret : ${secret}`)
    console.log(`  URI    : ${buildOtpAuthUri(secret, email)}`)
    console.log('')
    console.log('  Au prochain login admin, un code à 6 chiffres sera demandé.')
    console.log('  ⚠ Conservez ce secret en lieu sûr : il ne sera plus réaffiché.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Échec de l’activation de la MFA :', err)
  process.exit(1)
})
