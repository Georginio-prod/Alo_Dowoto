/**
 * Création (ou promotion) d'un compte administrateur du dashboard desktop.
 *
 * Les comptes admin ne sont jamais créés via l'inscription publique : ce
 * script est le seul point d'entrée. Il crée un compte avec le rôle `admin`
 * (ou promeut un compte existant portant le même email) et fixe son mot de
 * passe avec exactement la même primitive scrypt que server/utils/password.ts,
 * pour que la route /api/admin/login le vérifie correctement.
 *
 * Usage (depuis le dossier Alo_Dowoto) :
 *   node scripts/create-admin.mjs <email> <motDePasse>
 *
 * Exemple :
 *   node scripts/create-admin.mjs admin@worktogo.tg "MonMotDePasse1!"
 */
import 'dotenv/config'
import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { PrismaClient } from '@prisma/client'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH)
  return `${salt}:${derivedKey.toString('hex')}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  const email = String(value).trim().toLowerCase()
  return EMAIL_RE.test(email) ? email : null
}

async function main() {
  const [rawEmail, password] = process.argv.slice(2)

  if (!rawEmail || !password) {
    console.error('Usage : node scripts/create-admin.mjs <email> <motDePasse>')
    process.exit(1)
  }

  const email = normalizeEmail(rawEmail)
  if (!email) {
    console.error(`Email invalide : ${rawEmail}`)
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Le mot de passe doit contenir au moins 8 caractères.')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const passwordHash = await hashPassword(password)
    const existing = await prisma.user.findUnique({ where: { contact: email } })

    if (existing) {
      await prisma.user.update({
        where: { contact: email },
        data: { role: 'admin', passwordHash },
      })
      console.log(`✓ Compte existant promu administrateur : ${email}`)
    } else {
      await prisma.user.create({
        data: {
          contact: email,
          role: 'admin',
          passwordHash,
          username: 'admin',
          firstName: 'Admin',
          lastName: 'WorkTogo',
          location: 'Lomé',
        },
      })
      console.log(`✓ Nouvel administrateur créé : ${email}`)
    }
    console.log('Vous pouvez maintenant vous connecter depuis le dashboard admin desktop.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Échec de la création de l\'administrateur :', err)
  process.exit(1)
})
