import { FAQ_CATEGORIES } from '~~/app/data/faq'
import { getProviderDetail, searchProviders, searchProvidersNearby } from '~~/server/utils/providerDirectory'
import type { AiToolDefinition } from '~~/server/utils/ai/types'

/**
 * Outils réels que l'assistant peut appeler (#geoloc, 2.2) — règle absolue
 * anti-hallucination : toute recommandation de prestataire ou réponse sur le
 * fonctionnement de la plateforme doit passer par l'un de ces outils, jamais
 * être inventée par le modèle. Chaque outil retourne des données déjà
 * présentes en base/config (providerDirectory, app/data/faq.ts) — aucune
 * fiche fictive n'est jamais générée ici.
 */
export const ASSISTANT_TOOLS: AiToolDefinition[] = [
  {
    name: 'rechercherPrestataires',
    description:
      "Recherche de vrais prestataires WorkTogo par métier, position (quartier ou coordonnées) et budget. "
      + 'Retourne au maximum 5 résultats réels, triés par pertinence/proximité. Ne jamais recommander un '
      + 'prestataire qui ne provient pas du résultat de cet outil.',
    inputSchema: {
      type: 'object',
      properties: {
        metier: { type: 'string', description: "Métier ou secteur recherché, ex. 'plomberie', 'ménage', 'photographe'." },
        quartier: { type: 'string', description: 'Slug de quartier de la Région Maritime si connu (ex. be, agoe, tokoin).' },
        latitude: { type: 'number', description: "Latitude du chercheur si connue (issue de sa position détectée)." },
        longitude: { type: 'number', description: 'Longitude du chercheur si connue.' },
        rayonKm: { type: 'number', description: 'Rayon de recherche en km — 5 par défaut si omis.' },
        budgetMaxFcfa: { type: 'number', description: "Budget maximum en francs CFA, si l'utilisateur en a donné un." },
      },
      required: ['metier'],
    },
  },
  {
    name: 'obtenirProfilPrestataire',
    description: "Récupère la fiche complète (bio, disponibilité, tarif) d'un prestataire déjà trouvé via rechercherPrestataires, à partir de son identifiant.",
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Identifiant du prestataire renvoyé par rechercherPrestataires.' } },
      required: ['id'],
    },
  },
  {
    name: 'consulterFAQ',
    description:
      "Recherche dans la FAQ officielle WorkTogo (fonctionnement de la plateforme, paiement, litiges, sécurité, comptes). "
      + "Toujours utiliser cet outil avant de répondre à une question sur le fonctionnement de WorkTogo plutôt que d'inventer une réponse.",
    inputSchema: {
      type: 'object',
      properties: { question: { type: 'string', description: "Question de l'utilisateur, en français, telle quelle." } },
      required: ['question'],
    },
  },
]

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/** Score simple par mots communs (>2 caractères) entre la question posée et chaque entrée FAQ — pas de dépendance externe pour un contenu aussi restreint. */
function matchFaq(question: string, limit = 3) {
  const words = normalize(question).split(/\s+/).filter((word) => word.length > 2)
  const allItems = FAQ_CATEGORIES.flatMap((category) => category.items)

  return allItems
    .map((item) => {
      const haystack = normalize(`${item.question} ${item.answer}`)
      const score = words.filter((word) => haystack.includes(word)).length
      return { item, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Exécute un outil par son nom (#geoloc, 2.2) — dispatcher unique, appelé par chaque adaptateur fournisseur. */
export async function executeAssistantTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'rechercherPrestataires': {
      const metier = asString(input.metier)
      const quartier = asString(input.quartier)
      const latitude = asNumber(input.latitude)
      const longitude = asNumber(input.longitude)
      const rayonKm = asNumber(input.rayonKm)
      const budgetMax = asNumber(input.budgetMaxFcfa)

      const filters = { query: metier, quartier, priceMax: budgetMax }
      const nearby = latitude !== undefined && longitude !== undefined
        ? searchProvidersNearby({ ...filters, latitude, longitude }, rayonKm)
        : null
      const results = nearby ? nearby.results : searchProviders(filters)

      return {
        rayonUtiliseKm: nearby?.usedRadiusKm ?? null,
        rayonElargi: nearby?.widened ?? false,
        resultats: results.slice(0, 5).map((provider) => ({
          id: provider.id,
          nom: provider.displayName,
          secteur: provider.subSector,
          ville: provider.city,
          quartier: provider.quartier,
          note: provider.rating,
          nombreAvis: provider.reviewCount,
          tarifDepart: provider.priceFrom,
          distanceKm: provider.distanceKm,
          verifie: provider.verified,
        })),
      }
    }
    case 'obtenirProfilPrestataire': {
      const id = asString(input.id)
      const detail = id ? getProviderDetail(id, false) : null
      if (!detail) return { trouve: false }
      return {
        trouve: true,
        id: detail.id,
        nom: detail.displayName,
        secteur: detail.subSector,
        ville: detail.city,
        note: detail.rating,
        nombreAvis: detail.reviewCount,
        tarifDepart: detail.priceFrom,
        bio: detail.bio,
        disponibilite: detail.availability,
        verifie: detail.verified,
      }
    }
    case 'consulterFAQ': {
      const question = asString(input.question) ?? ''
      const matches = matchFaq(question)
      return matches.length === 0 ? { trouve: false } : { trouve: true, reponses: matches }
    }
    default:
      throw new Error(`Outil IA inconnu : ${name}`)
  }
}
