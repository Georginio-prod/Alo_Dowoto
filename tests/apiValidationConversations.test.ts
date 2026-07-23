import { describe, expect, it } from 'vitest'
import {
  checkInOutSchema,
  createConversationSchema,
  firstContactSchema,
  proposeRescheduleSchema,
  rebookSchema,
  recurringServiceSchema,
  sendMessageSchema,
  shareLocationSchema,
  submitReviewSchema,
} from '~~/server/utils/apiValidationConversations'

/** Retourne le premier message d'erreur d'un parse échoué (ou null si succès). */
function firstError(schema: { safeParse: (input: unknown) => { success: boolean, error?: { issues: { message: string }[] } } }, input: unknown): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : (result.error?.issues[0]?.message ?? '')
}

describe('createConversationSchema (#59, validation POST /api/conversations)', () => {
  it('accepte un providerId non vide et le trim', () => {
    const result = createConversationSchema.safeParse({ providerId: '  p01  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.providerId).toBe('p01')
  })

  it('rejette un providerId absent ou vide', () => {
    expect(firstError(createConversationSchema, {})).toBe("L'identifiant du prestataire est requis.")
    expect(firstError(createConversationSchema, { providerId: '   ' })).toBe("L'identifiant du prestataire est requis.")
  })
})

describe('checkInOutSchema (#268, validation POST check-in/check-out)', () => {
  it('accepte des coordonnées valides', () => {
    const result = checkInOutSchema.safeParse({ lat: 6.13, lng: 1.22 })
    expect(result.success).toBe(true)
  })

  it('accepte un corps vide (géolocalisation refusée par le navigateur)', () => {
    expect(checkInOutSchema.safeParse({}).success).toBe(true)
  })

  it('accepte l’absence totale de corps (aucune donnée envoyée) — même comportement que readBody().catch(() => undefined) avant #356', () => {
    const result = checkInOutSchema.safeParse(undefined)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({})
  })
})

describe('firstContactSchema (#129, validation POST /api/conversations/[id]/first-contact)', () => {
  it('accepte un corps valide', () => {
    const result = firstContactSchema.safeParse({ description: '  fuite  ', contact: '  90112233  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('fuite')
      expect(result.data.contact).toBe('90112233')
      expect(result.data.urgency).toBe('')
      expect(result.data.sectorAnswers).toEqual({})
    }
  })

  it('rejette une description ou un contact absent/vide', () => {
    expect(firstError(firstContactSchema, { contact: '90112233' })).toBe('Décrivez votre besoin pour envoyer votre demande.')
    expect(firstError(firstContactSchema, { description: 'fuite', contact: '   ' })).toBe('Vos coordonnées sont requises pour envoyer votre demande.')
  })

  it('accepte urgency et sectorAnswers optionnels', () => {
    const result = firstContactSchema.safeParse({
      description: 'fuite', contact: '90112233', urgency: 'demain', sectorAnswers: { depart: 'Lomé' },
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.sectorAnswers).toEqual({ depart: 'Lomé' })
  })
})

describe('sendMessageSchema (validation POST /api/conversations/[id]/messages)', () => {
  it('accepte un message non vide et le trim', () => {
    const result = sendMessageSchema.safeParse({ body: '  Bonjour  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.body).toBe('Bonjour')
  })

  it('rejette un message absent ou vide après trim', () => {
    expect(firstError(sendMessageSchema, { body: '   ' })).toBe('Le message ne peut pas être vide.')
    expect(firstError(sendMessageSchema, {})).toBe('Le message ne peut pas être vide.')
  })
})

describe('proposeRescheduleSchema (#270, validation POST /api/conversations/[id]/propose-reschedule)', () => {
  it('accepte une date future (le caractère futur est revérifié côté handler avec Date.now())', () => {
    expect(proposeRescheduleSchema.safeParse({ proposedAt: Date.now() + 86_400_000 }).success).toBe(true)
  })

  it('rejette une date non numérique ou infinie', () => {
    expect(firstError(proposeRescheduleSchema, { proposedAt: 'demain' })).toBe('La date proposée doit être une date future valide.')
    expect(firstError(proposeRescheduleSchema, { proposedAt: Number.POSITIVE_INFINITY })).toBe('La date proposée doit être une date future valide.')
    expect(firstError(proposeRescheduleSchema, {})).toBe('La date proposée doit être une date future valide.')
  })

  it('note est optionnelle', () => {
    expect(proposeRescheduleSchema.safeParse({ proposedAt: Date.now() + 1000, note: 'note libre' }).success).toBe(true)
  })
})

describe('rebookSchema (#266, validation POST /api/conversations/[id]/rebook)', () => {
  it('accepte une description non vide et la trim', () => {
    const result = rebookSchema.safeParse({ description: '  nouvelle demande  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.description).toBe('nouvelle demande')
  })

  it('rejette une description absente ou vide', () => {
    expect(firstError(rebookSchema, {})).toBe('Décrivez votre nouvelle demande pour relancer ce prestataire.')
  })
})

describe('recurringServiceSchema (#271, validation POST /api/conversations/[id]/recurring)', () => {
  it('accepte hebdomadaire et mensuelle', () => {
    expect(recurringServiceSchema.safeParse({ frequency: 'hebdomadaire' }).success).toBe(true)
    expect(recurringServiceSchema.safeParse({ frequency: 'mensuelle' }).success).toBe(true)
  })

  it('rejette une fréquence invalide ou absente', () => {
    expect(firstError(recurringServiceSchema, { frequency: 'quotidienne' })).toBe('Fréquence invalide (hebdomadaire ou mensuelle).')
    expect(firstError(recurringServiceSchema, {})).toBe('Fréquence invalide (hebdomadaire ou mensuelle).')
  })
})

describe('submitReviewSchema (#61, validation POST /api/conversations/[id]/review)', () => {
  it('accepte une note entière entre 1 et 5', () => {
    expect(submitReviewSchema.safeParse({ rating: 5 }).success).toBe(true)
  })

  it('rejette une note non entière, hors plage ou absente', () => {
    const msg = 'La note doit être un entier entre 1 et 5.'
    expect(firstError(submitReviewSchema, { rating: 0 })).toBe(msg)
    expect(firstError(submitReviewSchema, { rating: 6 })).toBe(msg)
    expect(firstError(submitReviewSchema, { rating: 3.5 })).toBe(msg)
    expect(firstError(submitReviewSchema, {})).toBe(msg)
  })

  it('comment est optionnel', () => {
    expect(submitReviewSchema.safeParse({ rating: 4, comment: 'Très bien' }).success).toBe(true)
  })
})

describe('shareLocationSchema (validation POST /api/conversations/[id]/share-location)', () => {
  it('accepte une paire de coordonnées valide', () => {
    expect(shareLocationSchema.safeParse({ lat: 6.1319, lng: 1.2228 }).success).toBe(true)
  })

  it('rejette des coordonnées hors plage, absentes ou non numériques', () => {
    const msg = 'Coordonnées de localisation invalides.'
    expect(firstError(shareLocationSchema, { lat: 91, lng: 1.2228 })).toBe(msg)
    expect(firstError(shareLocationSchema, { lat: 6.1319, lng: 181 })).toBe(msg)
    expect(firstError(shareLocationSchema, { lat: '6.13', lng: 1.2228 })).toBe(msg)
    expect(firstError(shareLocationSchema, { lat: 6.1319 })).toBe(msg)
  })
})
