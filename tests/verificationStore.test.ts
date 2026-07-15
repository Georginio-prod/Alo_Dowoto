import { describe, expect, it } from 'vitest'
import { getVerification, isValidIdentityImage, isVerified, submitVerification } from '~~/server/utils/verificationStore'

const ID_CARD = 'data:image/jpeg;base64,AAAA'
const PASSPORT_PHOTO = 'data:image/png;base64,BBBB'

describe('verificationStore — vérification d\'identité (#180+1)', () => {
  it('un compte n\'est pas vérifié tant qu\'aucune pièce n\'a été soumise', () => {
    expect(isVerified('user-not-submitted')).toBe(false)
    expect(getVerification('user-not-submitted')).toBeNull()
  })

  it('soumettre les deux pièces certifie immédiatement le compte', () => {
    const verification = submitVerification('user-1', ID_CARD, PASSPORT_PHOTO)
    expect(verification.userId).toBe('user-1')
    expect(isVerified('user-1')).toBe(true)
    expect(getVerification('user-1')?.idCardImage).toBe(ID_CARD)
    expect(getVerification('user-1')?.passportPhotoImage).toBe(PASSPORT_PHOTO)
  })

  it('une nouvelle soumission remplace la précédente pour le même utilisateur', () => {
    submitVerification('user-2', ID_CARD, PASSPORT_PHOTO)
    const first = getVerification('user-2')?.submittedAt
    const updated = submitVerification('user-2', 'data:image/jpeg;base64,CCCC', PASSPORT_PHOTO)
    expect(updated.idCardImage).toBe('data:image/jpeg;base64,CCCC')
    expect(getVerification('user-2')?.submittedAt).toBeGreaterThanOrEqual(first ?? 0)
  })

  it('accepte les data URLs image/jpeg et image/png', () => {
    expect(isValidIdentityImage(ID_CARD)).toBe(true)
    expect(isValidIdentityImage(PASSPORT_PHOTO)).toBe(true)
  })

  it('rejette les valeurs manquantes, non-string ou mal formées', () => {
    expect(isValidIdentityImage(undefined)).toBe(false)
    expect(isValidIdentityImage('')).toBe(false)
    expect(isValidIdentityImage('not-a-data-url')).toBe(false)
    expect(isValidIdentityImage('data:application/pdf;base64,AAAA')).toBe(false)
  })

  it('rejette une image dépassant la taille maximale autorisée', () => {
    const oversized = `data:image/jpeg;base64,${'A'.repeat(7_000_001)}`
    expect(isValidIdentityImage(oversized)).toBe(false)
  })
})
