import type { ModelTier } from '~~/server/utils/ai/types'

/**
 * Routage économique (#geoloc, 2.3) : un modèle léger et bon marché suffit à
 * la navigation/FAQ ; seule une demande de recommandation (qui va déclencher
 * `rechercherPrestataires` et nécessite de bien raisonner sur les résultats)
 * escalade vers un modèle plus capable. Décision prise sur le message brut,
 * avant tout appel au modèle — déterministe, sans coût, et testable sans
 * clé API.
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
