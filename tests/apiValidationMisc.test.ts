import { describe, expect, it } from 'vitest'
import {
  addFavoriteSchema,
  createComplaintSchema,
  createTestimonialSchema,
  planSlugSchema,
  submitVerificationSchema,
} from '~~/server/utils/apiValidationMisc'

/** Retourne le premier message d'erreur d'un parse échoué (ou null si succès). */
function firstError(schema: { safeParse: (input: unknown) => { success: boolean, error?: { issues: { message: string }[] } } }, input: unknown): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : (result.error?.issues[0]?.message ?? '')
}

describe('addFavoriteSchema (#65, validation POST /api/favorites)', () => {
  it('accepte un providerId non vide et le trim', () => {
    const result = addFavoriteSchema.safeParse({ providerId: '  p01  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.providerId).toBe('p01')
  })

  it('rejette un providerId absent ou vide', () => {
    expect(firstError(addFavoriteSchema, {})).toBe("L'identifiant du prestataire est requis.")
  })
})

describe('createComplaintSchema (validation POST /api/reclamations)', () => {
  function validBody() {
    return { category: 'technique', subject: 'Problème de connexion', message: 'Je narrive pas a me connecter depuis hier soir', contactEmail: 'a@b.com' }
  }

  it('accepte un corps valide', () => {
    expect(createComplaintSchema.safeParse(validBody()).success).toBe(true)
  })

  it('rejette une catégorie hors liste connue', () => {
    expect(firstError(createComplaintSchema, { ...validBody(), category: 'meteo' })).toBe('Sélectionnez une catégorie de réclamation.')
  })

  it('rejette un sujet trop court, trop long ou absent', () => {
    const msg = 'Le sujet doit contenir entre 3 et 120 caractères.'
    expect(firstError(createComplaintSchema, { ...validBody(), subject: 'Hi' })).toBe(msg)
    expect(firstError(createComplaintSchema, { ...validBody(), subject: 'x'.repeat(121) })).toBe(msg)
  })

  it('rejette un message trop court, trop long ou absent', () => {
    const msg = 'Le message doit contenir entre 10 et 2000 caractères.'
    expect(firstError(createComplaintSchema, { ...validBody(), message: 'court' })).toBe(msg)
    expect(firstError(createComplaintSchema, { ...validBody(), message: 'x'.repeat(2001) })).toBe(msg)
  })

  it('accepte un message d’exactement 10 caractères (limite basse)', () => {
    expect(createComplaintSchema.safeParse({ ...validBody(), message: '1234567890' }).success).toBe(true)
  })

  it('rejette un contact absent ou vide', () => {
    expect(firstError(createComplaintSchema, { ...validBody(), contactEmail: '   ' })).toBe('Indiquez une adresse email ou un numéro de téléphone de contact.')
  })
})

describe('planSlugSchema (validation POST /api/subscriptions et /api/subscriptions/trial)', () => {
  it('accepte une formule non vide', () => {
    expect(planSlugSchema.safeParse({ plan: 'mensuel' }).success).toBe(true)
  })

  it('plan est optionnel côté forme (findPlan valide la vraie valeur dans le handler)', () => {
    const result = planSlugSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.plan).toBe('')
  })
})

describe('createTestimonialSchema (#357 incrément 3, validation POST /api/testimonials)', () => {
  function validBody() {
    return { name: 'Ama K.', role: 'client', message: 'Excellent service, je recommande vivement WorkTogo à tous', rating: 5 }
  }

  it('accepte un corps valide et trim nom/message', () => {
    const result = createTestimonialSchema.safeParse({ ...validBody(), name: '  Ama K.  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Ama K.')
  })

  it('rejette un nom trop court, trop long ou absent', () => {
    const msg = 'Le nom doit contenir entre 2 et 60 caractères.'
    expect(firstError(createTestimonialSchema, { ...validBody(), name: 'A' })).toBe(msg)
    expect(firstError(createTestimonialSchema, { ...validBody(), name: 'x'.repeat(61) })).toBe(msg)
  })

  it('rejette un rôle hors client/prestataire', () => {
    expect(firstError(createTestimonialSchema, { ...validBody(), role: 'admin' })).toBe('Précisez si vous êtes chercheur ou prestataire.')
  })

  it('rejette un message trop court ou trop long', () => {
    const msg = 'Le message doit contenir entre 10 et 400 caractères.'
    expect(firstError(createTestimonialSchema, { ...validBody(), message: 'court' })).toBe(msg)
    expect(firstError(createTestimonialSchema, { ...validBody(), message: 'x'.repeat(401) })).toBe(msg)
  })

  it('rejette une note non entière ou hors plage', () => {
    const msg = 'La note doit être un nombre entier entre 1 et 5.'
    expect(firstError(createTestimonialSchema, { ...validBody(), rating: 0 })).toBe(msg)
    expect(firstError(createTestimonialSchema, { ...validBody(), rating: 6 })).toBe(msg)
  })
})

describe('submitVerificationSchema (#180+1, validation POST /api/verification)', () => {
  const VALID_ID = 'data:image/png;base64,aaaa'
  const VALID_PASSPORT = 'data:image/jpeg;base64,bbbb'

  it('accepte deux images data-URL valides', () => {
    expect(submitVerificationSchema.safeParse({ idCardImage: VALID_ID, passportPhotoImage: VALID_PASSPORT }).success).toBe(true)
  })

  it('rejette une carte d’identité absente, vide ou mal formée', () => {
    const msg = "La photo de la carte d'identité est requise (JPEG ou PNG, 5 Mo maximum)."
    expect(firstError(submitVerificationSchema, { passportPhotoImage: VALID_PASSPORT })).toBe(msg)
    expect(firstError(submitVerificationSchema, { idCardImage: 'not-a-data-url', passportPhotoImage: VALID_PASSPORT })).toBe(msg)
  })

  it('rejette une photo passeport absente ou mal formée', () => {
    const msg = 'La photo passeport (fond blanc, format international) est requise (JPEG ou PNG, 5 Mo maximum).'
    expect(firstError(submitVerificationSchema, { idCardImage: VALID_ID })).toBe(msg)
  })
})
