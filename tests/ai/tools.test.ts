import { describe, expect, it } from 'vitest'
import { ASSISTANT_TOOLS, executeAssistantTool } from '~~/server/utils/ai/tools'
import { upsertProviderProfile } from '~~/server/utils/providerStore'

/**
 * Outils de l'assistant IA (#geoloc, 2.2) — vérifie que chaque outil renvoie
 * des données réelles (jamais inventées) issues de providerDirectory/FAQ, la
 * règle anti-hallucination du besoin.
 */
describe('ASSISTANT_TOOLS', () => {
  it('déclare les trois outils attendus, chacun avec un schéma d’entrée', () => {
    const names = ASSISTANT_TOOLS.map((tool) => tool.name)
    expect(names).toEqual(['rechercherPrestataires', 'obtenirProfilPrestataire', 'consulterFAQ'])
    for (const tool of ASSISTANT_TOOLS) {
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.required?.length).toBeGreaterThan(0)
    }
  })
})

describe('executeAssistantTool — rechercherPrestataires', () => {
  it('renvoie de vrais résultats de l’annuaire (jamais une fiche inventée)', async () => {
    const result = await executeAssistantTool('rechercherPrestataires', { metier: 'Ménage à domicile' }) as {
      resultats: { id: string, nom: string }[]
    }
    expect(result.resultats.length).toBeGreaterThan(0)
    expect(result.resultats.every((r) => typeof r.id === 'string' && typeof r.nom === 'string')).toBe(true)
  })

  it('applique le rayon et signale l’élargissement quand des coordonnées sont fournies', async () => {
    upsertProviderProfile('ai-tool-provider-far', {
      displayName: 'Assistant Test Loin',
      sector: 'ai-tool-test-sector',
      latitude: 9.5511,
      longitude: 1.1861,
    })

    const result = await executeAssistantTool('rechercherPrestataires', {
      metier: 'Assistant Test Loin',
      latitude: 6.1319,
      longitude: 1.2228,
      rayonKm: 5,
    }) as { rayonUtiliseKm: number | null, rayonElargi: boolean }

    expect(result.rayonUtiliseKm).not.toBeNull()
    expect(result.rayonElargi).toBe(true)
  })

  it('renvoie une liste vide (pas une erreur) quand rien ne correspond', async () => {
    const result = await executeAssistantTool('rechercherPrestataires', { metier: 'un-métier-qui-nexiste-pas-du-tout' }) as {
      resultats: unknown[]
    }
    expect(result.resultats).toEqual([])
  })
})

describe('executeAssistantTool — obtenirProfilPrestataire', () => {
  it('renvoie la fiche complète d’un prestataire connu', async () => {
    const result = await executeAssistantTool('obtenirProfilPrestataire', { id: 'p01' }) as { trouve: boolean, nom?: string }
    expect(result.trouve).toBe(true)
    expect(result.nom).toBe('Akofa M.')
  })

  it('signale honnêtement qu’un prestataire est introuvable plutôt que d’inventer une fiche', async () => {
    const result = await executeAssistantTool('obtenirProfilPrestataire', { id: 'id-inexistant' }) as { trouve: boolean }
    expect(result.trouve).toBe(false)
  })
})

describe('executeAssistantTool — consulterFAQ', () => {
  it('retrouve une entrée réelle de la FAQ à partir d’une question reformulée', async () => {
    const result = await executeAssistantTool('consulterFAQ', { question: 'comment je peux contacter un prestataire' }) as {
      trouve: boolean
      reponses?: { question: string }[]
    }
    expect(result.trouve).toBe(true)
    expect(result.reponses?.some((r) => r.question === 'Comment contacter un prestataire ?')).toBe(true)
  })

  it('signale honnêtement l’absence de réponse plutôt que d’inventer', async () => {
    const result = await executeAssistantTool('consulterFAQ', { question: 'xyzabc123 question totalement hors sujet' }) as { trouve: boolean }
    expect(result.trouve).toBe(false)
  })
})

describe('executeAssistantTool — outil inconnu', () => {
  it('lève une erreur explicite (ne doit jamais arriver en pratique, seuls les outils déclarés sont exposés au modèle)', async () => {
    await expect(executeAssistantTool('outilInexistant', {})).rejects.toThrow('Outil IA inconnu')
  })
})
