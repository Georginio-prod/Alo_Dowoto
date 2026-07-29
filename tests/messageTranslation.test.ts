import { describe, expect, it } from 'vitest'
import { resolveMessageLines, resolveMessagePreview } from '~/utils/messageTranslation'

/**
 * Résolution des messages traduits à l'affichage (#i18n) : un faux `t` qui
 * se contente d'interpoler les paramètres dans un gabarit reconnaissable
 * suffit à vérifier que la bonne clé et les bons paramètres (formatés ou
 * non) sont transmis — la traduction FR/EN elle-même est couverte par la
 * validité des fichiers i18n/locales/*.json (voir la CI, npm run build).
 */
function fakeT(key: string, params?: Record<string, unknown>): string {
  const paramsPart = params ? ` ${JSON.stringify(params)}` : ''
  return `[${key}]${paramsPart}`
}

const LANGUAGE_TAG = 'fr-FR'

describe('resolveMessageLines (#i18n, messages de fil de discussion)', () => {
  it('un message libre (sans translationKey) est rendu tel quel, jamais traduit', () => {
    const lines = resolveMessageLines({ body: 'Bonjour, êtes-vous disponible ?', translationKey: null, translationParams: null }, fakeT, LANGUAGE_TAG)
    expect(lines).toEqual(['Bonjour, êtes-vous disponible ?'])
  })

  it('un message sans paramètres traduit directement via sa clé', () => {
    const lines = resolveMessageLines(
      { body: 'repli', translationKey: 'systemMessages.orderConfirmedByProvider', translationParams: {} },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(lines).toEqual(['[systemMessages.orderConfirmedByProvider] {}'])
  })

  it('un message avec paramètres génériques (texte libre, nom propre) les transmet tels quels', () => {
    const lines = resolveMessageLines(
      { body: 'repli', translationKey: 'systemMessages.rebookRequest', translationParams: { description: 'Nettoyage complet' } },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(lines).toEqual(['[systemMessages.rebookRequest] {"description":"Nettoyage complet"}'])
  })

  it('formate la date en paramètre selon la locale au lieu d’un texte pré-formaté (tacitValidationWarning)', () => {
    const deadline = new Date('2026-08-15T14:30:00Z').getTime()
    const lines = resolveMessageLines(
      { body: 'repli', translationKey: 'systemMessages.tacitValidationWarning', translationParams: { deadline } },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(lines[0]).toContain('systemMessages.tacitValidationWarning')
    expect(lines[0]).not.toContain(String(deadline)) // le timestamp brut ne doit jamais fuiter tel quel
  })

  it('rescheduleProposed formate la date et rattache la note libre séparément', () => {
    const date = new Date('2026-08-20T09:00:00Z').getTime()
    const withNote = resolveMessageLines(
      { body: 'repli', translationKey: 'systemMessages.rescheduleProposed', translationParams: { date, note: 'Merci de confirmer vite' } },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(withNote[0]).toContain('Merci de confirmer vite')

    const withoutNote = resolveMessageLines(
      { body: 'repli', translationKey: 'systemMessages.rescheduleProposed', translationParams: { date, note: null } },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(withoutNote[0]).not.toContain('null')
  })

  it('recurringDebited formate le montant selon la locale et traduit la fréquence', () => {
    const lines = resolveMessageLines(
      { body: 'repli', translationKey: 'systemMessages.recurringDebited', translationParams: { amount: 15000, frequency: 'hebdomadaire' } },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(lines[0]).toContain('systemMessages.frequency.hebdomadaire')
    expect(lines[0]).toContain('15')
  })

  it('firstContact reconstruit description, champs sectoriels, contact et urgence en plusieurs lignes', () => {
    const lines = resolveMessageLines(
      {
        body: 'repli',
        translationKey: 'systemMessages.firstContact',
        translationParams: {
          description: 'Besoin de ménage hebdomadaire',
          urgency: 'Le plus tôt possible',
          contact: '90******56',
          sectorSlug: 'menage',
          sectorAnswers: [
            { key: 'frequency', value: 'hebdomadaire' },
            { key: 'address', value: 'Quartier Tokoin' },
          ],
        },
      },
      fakeT,
      LANGUAGE_TAG,
    )

    expect(lines[0]).toBe('Besoin de ménage hebdomadaire')
    expect(lines.some((line) => line.includes('Quartier Tokoin'))).toBe(true)
    expect(lines.some((line) => line.includes('systemMessages.contactLine'))).toBe(true)
    expect(lines.some((line) => line.includes('systemMessages.urgencyLine'))).toBe(true)
  })

  it('firstContact omet la ligne d’urgence quand elle est absente', () => {
    const lines = resolveMessageLines(
      {
        body: 'repli',
        translationKey: 'systemMessages.firstContact',
        translationParams: { description: 'Besoin ponctuel', urgency: null, contact: '90******56', sectorSlug: null, sectorAnswers: [] },
      },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(lines.some((line) => line.includes('urgencyLine'))).toBe(false)
  })
})

describe('resolveMessagePreview (#i18n, aperçu barre latérale des conversations)', () => {
  it('ne garde que la première ligne, utile pour un message multi-lignes (firstContact)', () => {
    const preview = resolveMessagePreview(
      {
        body: 'repli',
        translationKey: 'systemMessages.firstContact',
        translationParams: { description: 'Besoin de ménage', urgency: null, contact: '90******56', sectorSlug: null, sectorAnswers: [] },
      },
      fakeT,
      LANGUAGE_TAG,
    )
    expect(preview).toBe('Besoin de ménage')
  })

  it('renvoie le body tel quel pour un message libre', () => {
    expect(resolveMessagePreview({ body: 'Salut !', translationKey: null, translationParams: null }, fakeT, LANGUAGE_TAG)).toBe('Salut !')
  })
})
