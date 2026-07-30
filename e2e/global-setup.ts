import { execSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Prépare une base SQLite jetable pour les tests de parcours — même principe
 * que tests/setup/prismaTestDb.ts côté Vitest : le fichier est supprimé puis
 * recréé à chaque exécution, ce qui rend les tests reproductibles et garantit
 * que prisma/dev.db (les données de développement) n'est jamais touchée.
 *
 * L'URL est injectée dans l'instance Nuxt via `webServer.env`
 * (playwright.config.ts) — les deux doivent rester alignées.
 */
const DB_DIR = fileURLToPath(new URL('./.tmp/', import.meta.url))
const DB_PATH = fileURLToPath(new URL('./.tmp/e2e.db', import.meta.url))
const DATABASE_URL = `file:${DB_PATH}`

export default function globalSetup() {
  mkdirSync(DB_DIR, { recursive: true })
  // Playwright démarre `webServer` *avant* ce global setup : quand un serveur
  // est réutilisé (`reuseExistingServer`), il tient déjà le fichier ouvert et
  // Windows refuse alors de le supprimer. On repart d'une base vierge quand
  // c'est possible, sinon on se contente de réappliquer le schéma — les tests
  // ne supposent jamais une base vide (chaque compte créé a un contact unique).
  try {
    rmSync(DB_PATH, { force: true })
  } catch {
    // Fichier verrouillé par une instance Nuxt encore vivante : on garde la base.
  }
  execSync('npx prisma db push --skip-generate', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  })
}
