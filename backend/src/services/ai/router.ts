import type { ModelTier } from './types'

/**
 * Routage économique (#geoloc, 2.3), porté iso depuis `server/utils/ai/router.ts`
 * (ADR-0016) : un modèle léger suffit à la navigation/FAQ ; seule une demande de
 * recommandation escalade vers un modèle plus capable. Décision déterministe sur
 * le message brut, sans coût ni clé API.
 */
const RECOMMENDATION_KEYWORDS = [
  'cherche',
  'cherches',
  'trouve',
  'trouver',
  'recommand',
  'prestataire',
  'plombier',
  'électricien',
  'menuisier',
  'coiffeur',
  'coiffeuse',
  'photographe',
  'près de',
  'pas cher',
  'qui peut',
  'disponible',
  'disponibilité',
  'devis',
  'tarif',
  'urgence',
  'aujourd\'hui',
  'quartier',
]

export function pickModelTier(userMessage: string): ModelTier {
  const normalized = userMessage.trim().toLowerCase()
  if (!normalized) return 'light'
  return RECOMMENDATION_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? 'heavy' : 'light'
}
