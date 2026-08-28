import { afterAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import {
  deleteVerification,
  getVerification,
  ID_DOCUMENT_RETENTION_MS,
  isValidIdentityImage,
  isVerified,
  submitVerification,
} from '~~/server/utils/verificationStore'

/**
 * verificationStore est désormais **persisté en base** (Prisma) : ses lectures
 * sont `async`. Le test nettoie les enregistrements qu'il crée (base partagée).
 */
const ID_CARD = 'data:image/jpeg;base64,AAAA'
const PASSPORT_PHOTO = 'data:image/png;base64,BBBB'
const USER_IDS = ['user-1', 'user-2', 'user-retention-1', 'user-retention-2', 'user-retention-3', 'user-erasure-1']

describe('verificationStore — vérification d\'identité (#180+1)', () => {
  afterAll(async () => {
    await prisma.verification.deleteMany({ where: { userId: { in: USER_IDS } } }).catch(() => undefined)
  })

  it('un compte n\'est pas vérifié tant qu\'aucune pièce n\'a été soumise', async () => {
    expect(await isVerified('user-not-submitted')).toBe(false)
    expect(await getVerification('user-not-submitted')).toBeNull()
  })

  it('soumettre les deux pièces certifie immédiatement le compte', async () => {
    const verification = await submitVerification('user-1', ID_CARD, PASSPORT_PHOTO)
    expect(verification.userId).toBe('user-1')
    expect(await isVerified('user-1')).toBe(true)
    expect((await getVerification('user-1'))?.idCardImage).toBe(ID_CARD)
    expect((await getVerification('user-1'))?.passportPhotoImage).toBe(PASSPORT_PHOTO)
  })

  it('une nouvelle soumission remplace la précédente pour le même utilisateur', async () => {
    await submitVerification('user-2', ID_CARD, PASSPORT_PHOTO)
    const first = (await getVerification('user-2'))?.submittedAt
    const updated = await submitVerification('user-2', 'data:image/jpeg;base64,CCCC', PASSPORT_PHOTO)
    expect(updated.idCardImage).toBe('data:image/jpeg;base64,CCCC')
    expect((await getVerification('user-2'))?.submittedAt).toBeGreaterThanOrEqual(first ?? 0)
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

describe('verificationStore — minimisation des données, purge automatique (#286)', () => {
  it('conserve les images tant que le délai de rétention n’est pas dépassé', async () => {
    await submitVerification('user-retention-1', ID_CARD, PASSPORT_PHOTO)
    expect((await getVerification('user-retention-1'))?.idCardImage).toBe(ID_CARD)
    expect((await getVerification('user-retention-1'))?.purgedAt).toBeNull()
  })

  it('efface automatiquement les images passé le délai de rétention, sans révoquer le statut vérifié', async () => {
    const now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    await submitVerification('user-retention-2', ID_CARD, PASSPORT_PHOTO)

    spy.mockImplementation(() => now + ID_DOCUMENT_RETENTION_MS + 1)
    const verification = await getVerification('user-retention-2')
    spy.mockRestore()

    expect(verification?.idCardImage).toBeNull()
    expect(verification?.passportPhotoImage).toBeNull()
    expect(verification?.purgedAt).not.toBeNull()
    expect(await isVerified('user-retention-2')).toBe(true)
  })

  it('ne purge pas juste avant l’échéance (cas limite)', async () => {
    const now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    await submitVerification('user-retention-3', ID_CARD, PASSPORT_PHOTO)

    spy.mockImplementation(() => now + ID_DOCUMENT_RETENTION_MS - 1)
    const verification = await getVerification('user-retention-3')
    spy.mockRestore()

    expect(verification?.idCardImage).toBe(ID_CARD)
  })

  it('deleteVerification efface entièrement l’enregistrement (droit à l’effacement)', async () => {
    await submitVerification('user-erasure-1', ID_CARD, PASSPORT_PHOTO)
    expect(await deleteVerification('user-erasure-1')).toBe(true)
    expect(await isVerified('user-erasure-1')).toBe(false)
    expect(await getVerification('user-erasure-1')).toBeNull()
  })

  it('deleteVerification renvoie false pour un utilisateur sans vérification (cas limite)', async () => {
    expect(await deleteVerification('user-jamais-verifie')).toBe(false)
  })
})
