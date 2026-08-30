import {
  contournementAttemptRepository,
  type ContournementAttempt,
  type ContournementAttemptRepository,
  type LogContournementAttemptInput,
} from '../repositories/contournementAttemptRepository'

/**
 * Journalisation des tentatives de contournement (#265), portée iso depuis
 * `server/utils/contournementAttemptStore.ts` (ADR-0016). Fine couche au-dessus
 * du repository — la détection heuristique vit dans `utils/contournementDetector`.
 */
export function createContournementAttemptService(repo: ContournementAttemptRepository = contournementAttemptRepository) {
  return {
    logAttempt(input: LogContournementAttemptInput): Promise<ContournementAttempt> {
      return repo.log(input)
    },
    listAttempts(): Promise<ContournementAttempt[]> {
      return repo.listAll()
    },
    listAttemptsForUser(userId: string): Promise<ContournementAttempt[]> {
      return repo.listForUser(userId)
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const contournementAttemptService = createContournementAttemptService()
