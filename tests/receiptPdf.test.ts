import { describe, expect, it } from 'vitest'
import { generateMovementReceiptPdf, generatePaymentReceiptPdf, receiptLocaleFromQuery } from '~~/server/utils/receiptPdf'
import type { WalletMovement } from '~~/server/utils/walletStore'
import type { Payment } from '~~/server/utils/paymentStore'
import type { User } from '~~/server/utils/userStore'

/**
 * Génération de reçus PDF (#363) : on ne vérifie pas le rendu pixel par
 * pixel (hors de portée d'un test unitaire), seulement qu'un buffer PDF
 * valide et non vide est produit pour chaque combinaison locale/type, sans
 * lever d'exception — la traçabilité fine du contenu est couverte
 * manuellement (voir la revue de PR).
 */

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    contact: '+22890000000',
    role: 'client',
    createdAt: Date.now(),
    username: 'testuser',
    firstName: 'Awa',
    lastName: 'Koffi',
    location: 'Lomé',
    ...overrides,
  }
}

function makeMovement(overrides: Partial<WalletMovement> = {}): WalletMovement {
  return {
    id: 'movement-1',
    walletUserId: 'user-1',
    type: 'escrow_debit',
    amount: 15000,
    reference: 'order-1',
    counterpartyUserId: null,
    createdAt: Date.now(),
    ...overrides,
  }
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    userId: 'user-1',
    subscriptionId: 'sub-1',
    provider: 'flooz',
    phone: '+22890000000',
    amount: 5000,
    status: 'confirmed',
    operatorRef: 'OP-1',
    createdAt: Date.now(),
    resolvedAt: Date.now(),
    ...overrides,
  }
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length > 0 && buffer.subarray(0, 4).toString('latin1') === '%PDF'
}

describe('receiptPdf (#363, reçus PDF débits/libérations séquestre et abonnements)', () => {
  it.each(['fr', 'en'] as const)('generateMovementReceiptPdf produit un PDF valide en %s', async (locale) => {
    const pdf = await generateMovementReceiptPdf(makeMovement(), makeUser(), null, locale)
    expect(isPdfBuffer(pdf)).toBe(true)
  })

  it('generateMovementReceiptPdf inclut la contrepartie quand elle est fournie', async () => {
    const pdf = await generateMovementReceiptPdf(
      makeMovement({ type: 'escrow_release', counterpartyUserId: 'user-2' }),
      makeUser(),
      makeUser({ id: 'user-2', firstName: 'Kodjo', lastName: 'Mensah' }),
      'fr',
    )
    expect(isPdfBuffer(pdf)).toBe(true)
  })

  it.each(['mensuel', 'trimestriel', 'annuel'] as const)('generatePaymentReceiptPdf produit un PDF valide pour la formule %s', async (plan) => {
    const pdf = await generatePaymentReceiptPdf(makePayment(), makeUser(), plan, 'fr')
    expect(isPdfBuffer(pdf)).toBe(true)
  })

  it('receiptLocaleFromQuery ne reconnaît que "en", tout le reste retombe sur "fr"', () => {
    expect(receiptLocaleFromQuery('en')).toBe('en')
    expect(receiptLocaleFromQuery('fr')).toBe('fr')
    expect(receiptLocaleFromQuery(undefined)).toBe('fr')
    expect(receiptLocaleFromQuery('de')).toBe('fr')
  })
})
