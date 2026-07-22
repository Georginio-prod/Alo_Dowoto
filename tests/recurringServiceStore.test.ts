import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { findOrCreateConversation, getMessages } from '~~/server/utils/conversationStore'
import { createEscrowOrder, getEscrowOrderByConversationId, payEscrowOrder } from '~~/server/utils/escrowOrderStore'
import {
  cancelRecurringService,
  createRecurringService,
  getRecurringServiceByConversationId,
} from '~~/server/utils/recurringServiceStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

describe('createRecurringService (#271 offres récurrentes natives)', () => {
  it('crée un service actif avec une première échéance immédiatement due', () => {
    const conversation = findOrCreateConversation(id(), id())
    const result = createRecurringService({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      providerId: conversation.providerId,
      amount: 5000,
      frequency: 'hebdomadaire',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.service.status).toBe('active')
      expect(result.service.nextChargeAt).toBeLessThanOrEqual(Date.now())
      expect(result.service.lastChargedAt).toBeNull()
    }
  })

  it('refuse une création si un service récurrent est déjà actif pour cette conversation', () => {
    const conversation = findOrCreateConversation(id(), id())
    createRecurringService({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      providerId: conversation.providerId,
      amount: 5000,
      frequency: 'hebdomadaire',
    })

    const second = createRecurringService({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      providerId: conversation.providerId,
      amount: 5000,
      frequency: 'mensuelle',
    })
    expect(second).toEqual({ ok: false, error: 'already_active' })
  })

  it('permet de relancer un service récurrent après annulation', () => {
    const conversation = findOrCreateConversation(id(), id())
    createRecurringService({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      providerId: conversation.providerId,
      amount: 5000,
      frequency: 'hebdomadaire',
    })
    cancelRecurringService(conversation.id)

    const relaunched = createRecurringService({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      providerId: conversation.providerId,
      amount: 5000,
      frequency: 'mensuelle',
    })
    expect(relaunched.ok).toBe(true)
  })
})

describe('cancelRecurringService', () => {
  it('annule un service actif', () => {
    const conversation = findOrCreateConversation(id(), id())
    createRecurringService({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      providerId: conversation.providerId,
      amount: 5000,
      frequency: 'hebdomadaire',
    })

    const result = cancelRecurringService(conversation.id)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.service.status).toBe('cancelled')
  })

  it('renvoie not_found pour une conversation sans service récurrent', () => {
    expect(cancelRecurringService(id())).toEqual({ ok: false, error: 'not_found' })
  })

  it('refuse d’annuler un service déjà annulé', () => {
    const conversation = findOrCreateConversation(id(), id())
    createRecurringService({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      providerId: conversation.providerId,
      amount: 5000,
      frequency: 'hebdomadaire',
    })
    cancelRecurringService(conversation.id)

    expect(cancelRecurringService(conversation.id)).toEqual({ ok: false, error: 'invalid_status' })
  })
})

describe('getRecurringServiceByConversationId — déclenchement du prélèvement dû (#271)', () => {
  it('prélève le montant dû, avance la prochaine échéance et poste un message système', async () => {
    const client = id()
    const provider = id()
    const conversation = findOrCreateConversation(client, provider)
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    createRecurringService({ conversationId: conversation.id, clientId: client, providerId: provider, amount: 5000, frequency: 'hebdomadaire' })

    const service = await getRecurringServiceByConversationId(conversation.id)

    expect(service?.status).toBe('active')
    expect(service?.lastChargedAt).not.toBeNull()
    expect(service?.nextChargeAt).toBeGreaterThan(Date.now())
    expect(await getBalance(client)).toBe(0)
    expect((await getEscrowOrderByConversationId(conversation.id))?.status).toBe('in_escrow')

    const notification = getMessages(conversation.id).at(-1)
    expect(notification?.body).toContain('Prélèvement automatique')
  })

  it('ne prélève qu’une seule fois tant que la prochaine échéance (avancée après le 1er prélèvement) n’est pas atteinte', async () => {
    const client = id()
    const provider = id()
    const conversation = findOrCreateConversation(client, provider)
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 10000, reference: 'REF' })

    const now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    createRecurringService({ conversationId: conversation.id, clientId: client, providerId: provider, amount: 5000, frequency: 'hebdomadaire' })

    await getRecurringServiceByConversationId(conversation.id) // 1ère échéance, due dès la création
    // Le cycle précédent (commande escrow) n'étant pas encore résolu (released/refunded),
    // un second accès juste après ne doit prélever ni une deuxième fois ni empiler de commande,
    // même si on avance un peu l'horloge (toujours bien avant la prochaine échéance réelle, +7j).
    spy.mockImplementation(() => now + 1000)
    const secondRead = await getRecurringServiceByConversationId(conversation.id)
    spy.mockRestore()

    expect(secondRead?.status).toBe('active')
    expect(await getBalance(client)).toBe(5000) // un seul prélèvement de 5000, pas deux
  })

  it('passe en payment_failed si le solde est insuffisant, et journalise un message d’échec', async () => {
    const client = id()
    const provider = id()
    const conversation = findOrCreateConversation(client, provider)
    // Pas de crédit de portefeuille : solde nul.
    createRecurringService({ conversationId: conversation.id, clientId: client, providerId: provider, amount: 5000, frequency: 'hebdomadaire' })

    const service = await getRecurringServiceByConversationId(conversation.id)

    expect(service?.status).toBe('payment_failed')
    const notification = getMessages(conversation.id).at(-1)
    expect(notification?.body).toContain('échoué')
  })

  it('n’empile pas une nouvelle commande tant que le cycle précédent n’est pas terminal (in_escrow/delivered/disputed)', async () => {
    const client = id()
    const provider = id()
    const conversation = findOrCreateConversation(client, provider)
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 20000, reference: 'REF' })
    // Une commande est déjà en cours (ex. première prise de contact classique), non résolue.
    await createEscrowOrder({ conversationId: conversation.id, clientId: client, providerId: provider, amount: 5000 })
    await payEscrowOrder(conversation.id)

    createRecurringService({ conversationId: conversation.id, clientId: client, providerId: provider, amount: 5000, frequency: 'hebdomadaire' })
    const service = await getRecurringServiceByConversationId(conversation.id)

    expect(service?.status).toBe('active')
    expect(service?.lastChargedAt).toBeNull()
    // Un seul débit (celui de la commande initiale), pas un second pour le service récurrent.
    expect(await getBalance(client)).toBe(15000)
  })
})
