import { describe, expect, it } from 'vitest'
import {
  cancelEscrowSchema,
  disputeEscrowSchema,
  initiatePaymentSchema,
  MIN_RECHARGE_AMOUNT,
  paymentWebhookSchema,
  respondDisputeSchema,
  walletRechargeSchema,
  walletWebhookSchema,
  walletWithdrawSchema,
} from '~~/server/utils/apiValidation'

/** Retourne le premier message d'erreur d'un parse échoué (ou null si succès). */
function firstError(schema: { safeParse: (input: unknown) => { success: boolean, error?: { issues: { message: string }[] } } }, input: unknown): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : (result.error?.issues[0]?.message ?? '')
}

describe('initiatePaymentSchema (#34, validation POST /api/payments/initiate)', () => {
  it('accepte un corps valide', () => {
    const result = initiatePaymentSchema.safeParse({ subscriptionId: 'sub-1', provider: 'flooz', phone: '90112233' })
    expect(result.success).toBe(true)
  })

  it('subscriptionId est optionnel (résolu ensuite par le handler)', () => {
    const result = initiatePaymentSchema.safeParse({ provider: 'flooz', phone: '90112233' })
    expect(result.success).toBe(true)
  })

  it('rejette un opérateur hors flooz/tmoney', () => {
    expect(firstError(initiatePaymentSchema, { provider: 'orange-money', phone: '90112233' })).toBe('Opérateur invalide.')
    expect(firstError(initiatePaymentSchema, { phone: '90112233' })).toBe('Opérateur invalide.')
  })

  it('rejette un téléphone absent ou vide (le format exact est vérifié par normalizeContact dans le handler)', () => {
    expect(firstError(initiatePaymentSchema, { provider: 'flooz', phone: '   ' })).toBe('Entrez un numéro valide (8 chiffres).')
    expect(firstError(initiatePaymentSchema, { provider: 'flooz' })).toBe('Entrez un numéro valide (8 chiffres).')
  })
})

describe('walletRechargeSchema (#193, validation POST /api/wallet/recharge)', () => {
  it('accepte un corps valide', () => {
    const result = walletRechargeSchema.safeParse({ provider: 'tmoney', phone: '90112233', amount: MIN_RECHARGE_AMOUNT })
    expect(result.success).toBe(true)
  })

  it('rejette un montant sous le minimum, non entier ou absent', () => {
    const msg = `Le montant minimum de recharge est de ${MIN_RECHARGE_AMOUNT} F CFA.`
    expect(firstError(walletRechargeSchema, { provider: 'flooz', phone: '90112233', amount: MIN_RECHARGE_AMOUNT - 1 })).toBe(msg)
    expect(firstError(walletRechargeSchema, { provider: 'flooz', phone: '90112233', amount: 750.5 })).toBe(msg)
    expect(firstError(walletRechargeSchema, { provider: 'flooz', phone: '90112233' })).toBe(msg)
  })

  it('rejette un opérateur invalide', () => {
    expect(firstError(walletRechargeSchema, { provider: 'wave', phone: '90112233', amount: MIN_RECHARGE_AMOUNT })).toBe('Opérateur invalide.')
  })
})

describe('walletWithdrawSchema (validation POST /api/wallet/withdraw)', () => {
  it('accepte un montant positif', () => {
    expect(walletWithdrawSchema.safeParse({ amount: 5000 }).success).toBe(true)
  })

  it('rejette un montant nul, négatif ou non numérique (le minimum métier reste vérifié par requestWithdrawal)', () => {
    expect(firstError(walletWithdrawSchema, { amount: 0 })).toBe('Montant invalide.')
    expect(firstError(walletWithdrawSchema, { amount: -100 })).toBe('Montant invalide.')
    expect(firstError(walletWithdrawSchema, { amount: 'beaucoup' })).toBe('Montant invalide.')
    expect(firstError(walletWithdrawSchema, {})).toBe('Montant invalide.')
  })
})

describe('disputeEscrowSchema (#197, validation POST /api/conversations/[id]/dispute)', () => {
  it('accepte un motif non vide et le trim', () => {
    const result = disputeEscrowSchema.safeParse({ reason: '  colis endommagé  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reason).toBe('colis endommagé')
  })

  it('rejette un motif absent ou vide après trim', () => {
    expect(firstError(disputeEscrowSchema, { reason: '   ' })).toBe('Le motif du litige est obligatoire.')
    expect(firstError(disputeEscrowSchema, {})).toBe('Le motif du litige est obligatoire.')
  })

  it('accepte des preuves optionnelles (#274) et les trim', () => {
    const result = disputeEscrowSchema.safeParse({ reason: 'colis endommagé', evidence: '  photo1.jpg, photo2.jpg  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.evidence).toBe('photo1.jpg, photo2.jpg')
  })

  it('accepte l’absence de preuves (#274)', () => {
    expect(disputeEscrowSchema.safeParse({ reason: 'colis endommagé' }).success).toBe(true)
  })
})

describe('respondDisputeSchema (#274, validation POST /api/conversations/[id]/respond-dispute)', () => {
  it('accepte une réponse non vide et la trim', () => {
    const result = respondDisputeSchema.safeParse({ response: '  la prestation a bien été réalisée  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.response).toBe('la prestation a bien été réalisée')
  })

  it('rejette une réponse absente ou vide après trim', () => {
    expect(firstError(respondDisputeSchema, { response: '   ' })).toBe('Votre réponse au litige est obligatoire.')
    expect(firstError(respondDisputeSchema, {})).toBe('Votre réponse au litige est obligatoire.')
  })
})

describe('cancelEscrowSchema (#196, validation POST /api/conversations/[id]/cancel)', () => {
  it('accepte un motif non vide et le trim', () => {
    const result = cancelEscrowSchema.safeParse({ reason: '  indisponible  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reason).toBe('indisponible')
  })

  it('rejette un motif absent ou vide après trim', () => {
    expect(firstError(cancelEscrowSchema, { reason: '' })).toBe("Le motif d'annulation est obligatoire.")
    expect(firstError(cancelEscrowSchema, {})).toBe("Le motif d'annulation est obligatoire.")
  })
})

describe('paymentWebhookSchema (#34/#356, validation du corps déjà parsé de POST /api/payments/webhook)', () => {
  function validBody() {
    return { paymentId: 'pay_1', status: 'success', timestamp: Date.now(), nonce: 'nonce-1' }
  }

  it('accepte un corps valide', () => {
    expect(paymentWebhookSchema.safeParse({ ...validBody(), operatorRef: 'OP-1' }).success).toBe(true)
  })

  it('operatorRef est optionnel', () => {
    expect(paymentWebhookSchema.safeParse(validBody()).success).toBe(true)
  })

  it('rejette un paymentId absent ou vide', () => {
    const { paymentId: _paymentId, ...withoutPaymentId } = validBody()
    expect(firstError(paymentWebhookSchema, withoutPaymentId)).toBe('Requête webhook invalide.')
    expect(firstError(paymentWebhookSchema, { ...validBody(), paymentId: '  ' })).toBe('Requête webhook invalide.')
  })

  it('rejette un statut hors success/failed', () => {
    expect(firstError(paymentWebhookSchema, { ...validBody(), status: 'en_cours' })).toBe('Requête webhook invalide.')
  })

  it('rejette un timestamp ou un nonce absent (#355, anti-rejeu)', () => {
    const { timestamp: _timestamp, ...withoutTimestamp } = validBody()
    expect(firstError(paymentWebhookSchema, withoutTimestamp)).toBe('Requête webhook invalide.')
    const { nonce: _nonce, ...withoutNonce } = validBody()
    expect(firstError(paymentWebhookSchema, withoutNonce)).toBe('Requête webhook invalide.')
  })
})

describe('walletWebhookSchema (#193/#356, validation du corps déjà parsé de POST /api/wallet/webhook)', () => {
  function validBody() {
    return { rechargeId: 'rec_1', status: 'success', timestamp: Date.now(), nonce: 'nonce-1' }
  }

  it('accepte un corps valide', () => {
    expect(walletWebhookSchema.safeParse(validBody()).success).toBe(true)
  })

  it('rejette un rechargeId absent ou un statut invalide', () => {
    const { rechargeId: _rechargeId, ...withoutRechargeId } = validBody()
    expect(firstError(walletWebhookSchema, withoutRechargeId)).toBe('Requête webhook invalide.')
    expect(firstError(walletWebhookSchema, { ...validBody(), status: 'annule' })).toBe('Requête webhook invalide.')
  })

  it('rejette un timestamp ou un nonce absent (#355, anti-rejeu)', () => {
    const { timestamp: _timestamp, ...withoutTimestamp } = validBody()
    expect(firstError(walletWebhookSchema, withoutTimestamp)).toBe('Requête webhook invalide.')
  })
})
