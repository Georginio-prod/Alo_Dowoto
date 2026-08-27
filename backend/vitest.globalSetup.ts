import { execSync } from 'node:child_process'

/**
 * Prépare la base de test ISOLÉE du backend. On ne touche JAMAIS la base
 * partagée `worktogo` : l'app Nuxt en est propriétaire (schéma + migrations),
 * le backend n'en est que consommateur. Ici on synchronise le schéma du backend
 * (`db push`, sans reset destructif) dans une base dédiée
 * `worktogo_backend_test` ; les tests créent des comptes uniques et nettoient
 * après eux. Nécessite le conteneur Docker démarré (`docker compose up -d postgres`).
 */
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://worktogo:worktogo@localhost:5433/worktogo_backend_test'

export default function setup() {
  // Le backend est propriétaire de Prisma (backend/prisma/schema.prisma via
  // backend/prisma.config.ts). `db push` synchronise le schéma dans la base de
  // test isolée. Lancé depuis le cwd backend → la config est trouvée automatiquement.
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  })
}
