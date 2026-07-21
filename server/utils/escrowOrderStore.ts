import { randomUUID } from 'node:crypto'
import {
  addSystemMessage,
  findLatestUnresolvedMessage,
  findOrCreateConversation,
  getClientContact,
  markFirstContactDone,
  resolveMessage,
  setClientContact,
} from '~~/server/utils/conversationStore'
import {
  getEffectiveRating,
  getProviderById,
  type ProviderSearchResult,
  resolveProviderRate,
  searchProviders,
} from '~~/server/utils/providerDirectory'
import { creditWallet, debitWallet, PLATFORM_WALLET_USER_ID } from '~~/server/utils/walletStore'

/**
 * Store en mémoire pour les commandes en séquestre (#194/#195, brique du
 * système de paiement séquestre — voir l'epic #191). Même limite que les
 * autres stores (pas de base de données encore en place, voir #45/#46).
 *
 * Une commande est créée en même temps que la prise de premier contact
 * (#129) est soumise, avec le tarif fixe du prestataire (`resolveProviderRate`,
 * server/utils/providerDirectory.ts — cette itération ne gère que le tarif
 * fixe affiché, pas le devis à valider, voir #194). Tant qu'elle n'est pas
 * payée, le prestataire ne doit voir ni le message ni le détail de la
 * demande (voir server/api/conversations/[id]/messages.get.ts).
 *
 * Cycle de vie : awaiting_payment → in_escrow (#194) → delivered → released
 * (#195, double validation) ; le prestataire peut aussi annuler après le
 * débit (in_escrow ou delivered) → refunded (#196, remboursement intégral
 * et automatique, motif obligatoire). `delivered` déclenche un délai de
 * validation tacite (`TACIT_VALIDATION_DELAY_MS`) : si le chercheur ne
 * confirme ni ne conteste dans ce délai, la commande est libérée
 * automatiquement à la prochaine lecture (voir `applyTacitValidationIfExpired`)
 * — pas de tâche planifiée nécessaire tant que le processus reste unique
 * (prototype en mémoire). Le chercheur peut aussi, à la place de confirmer,
 * ouvrir un litige (#197) : `delivered` → `disputed`, ce qui gèle les fonds
 * (ni libération ni remboursement automatique) et interrompt la validation
 * tacite, en attendant l'arbitrage d'une équipe de médiation WorkTogo.
 */

export type EscrowOrderStatus = 'awaiting_payment' | 'in_escrow' | 'delivered' | 'released' | 'refunded' | 'disputed'

export interface EscrowOrder {
  id: string
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  status: EscrowOrderStatus
  createdAt: number
  paidAt: number | null
  deliveredAt: number | null
  releasedAt: number | null
  cancelledAt: number | null
  /** Motif obligatoire de l'annulation prestataire (#196), à des fins de modération/fiabilité. */
  cancelReason: string | null
  disputedAt: number | null
  /** Motif du litige ouvert par le chercheur (#197), transmis à l'équipe de médiation. */
  disputeReason: string | null
  /** Preuves fournies par le chercheur à l'ouverture du litige (#274), sinon `null`. */
  disputeEvidence: string | null
  /** Réponse du prestataire au litige (#274, « en médiation ») — bloque toujours la libération automatique tant que le litige n'est pas explicitement résolu, que le prestataire ait répondu ou non. */
  disputeResponse: string | null
  disputeRespondedAt: number | null
  /**
   * Preuve d'intervention in-app (#268, anti-fuite) : le prestataire
   * enregistre son arrivée puis son départ du lieu d'intervention. La
   * géolocalisation est enregistrée quand le navigateur l'autorise, mais
   * n'est pas exigée — c'est l'existence même des deux horodatages qui
   * constitue la preuve requise avant de pouvoir marquer la prestation comme
   * terminée (voir `markEscrowOrderDelivered`).
   */
  checkInAt: number | null
  checkInLocation: { lat: number; lng: number } | null
  checkOutAt: number | null
  checkOutLocation: { lat: number; lng: number } | null
}

/**
 * Commission WorkTogo prélevée à la libération des fonds (pas à la mise en
 * séquestre), politique par défaut à valider avec l'équipe produit (#191).
 */
export const ESCROW_COMMISSION_RATE = 0.1

/** Délai de validation tacite (#195) : 72h sans réponse du chercheur après livraison. */
export const TACIT_VALIDATION_DELAY_MS = 72 * 60 * 60 * 1000

/**
 * Délai maximal laissé au prestataire pour confirmer la prise en charge
 * après paiement (#289) : passé ce délai sans réponse, la demande est
 * automatiquement réattribuée au prestataire suivant du même secteur/ville.
 */
export const PROVIDER_RESPONSE_TIMEOUT_MS = 30 * 60 * 1000

/**
 * Grille d'annulation symétrique (#275). Le prestataire annule toujours sans
 * pénalité pour le chercheur (voir `cancelEscrowOrder`) — c'était déjà le
 * cas. Ce qui manquait : quand c'est le *chercheur* qui annule après avoir
 * payé, rien n'indemnisait le prestataire qui s'était rendu disponible.
 * Délai de grâce : annulation sans pénalité si elle intervient dans les 2h
 * suivant le paiement (le prestataire n'a pas encore eu le temps de
 * s'organiser). Passé ce délai, une part du montant reste acquise au
 * prestataire à titre d'indemnisation, le solde est remboursé au chercheur.
 */
export const CLIENT_CANCELLATION_GRACE_PERIOD_MS = 2 * 60 * 60 * 1000
export const CLIENT_LATE_CANCELLATION_PENALTY_RATE = 0.2

const ordersByConversationId = new Map<string, EscrowOrder>()

/** La commande existante bloque-t-elle toute nouvelle demande sur cette conversation ? Seules `released`/`refunded` sont terminales et permettent une reprise (#266). */
const TERMINAL_STATUSES_ALLOWING_REBOOK: readonly EscrowOrderStatus[] = ['released', 'refunded']

/** Horodatages de création des commandes de ce chercheur, tous statuts confondus — sert à détecter un rythme de création anormal (#277, `evaluateOrderRisk`). */
export function getRecentOrderTimestampsForClient(clientId: string): number[] {
  const timestamps: number[] = []
  for (const order of ordersByConversationId.values()) {
    if (order.clientId === clientId) timestamps.push(order.createdAt)
  }
  return timestamps
}

/**
 * Nombre maximal de demandes non payées qu'un chercheur peut avoir ouvertes
 * simultanément (#280) : le quota mensuel de contacts (`CLIENT_CONTACTS_MONTHLY_LIMIT`,
 * server/utils/quotaStore.ts) limite le nombre total de demandes par mois,
 * mais rien n'empêchait d'ouvrir plusieurs demandes à la fois sans jamais en
 * payer aucune — frein supplémentaire contre les demandes « pour voir »,
 * sans intention réelle de payer.
 */
export const MAX_SIMULTANEOUS_UNPAID_ORDERS = 2

/** Nombre de commandes en attente de paiement (`awaiting_payment`) pour ce chercheur, tous prestataires confondus (#280). */
export function countUnpaidOrdersForClient(clientId: string): number {
  let count = 0
  for (const order of ordersByConversationId.values()) {
    if (order.clientId === clientId && order.status === 'awaiting_payment') count += 1
  }
  return count
}

/**
 * Idempotent tant que la commande existante est active (`awaiting_payment` à
 * `disputed`) : une conversation n'a jamais plus d'une commande active à la
 * fois. Une fois la commande précédente terminale (`released`/`refunded`),
 * un nouvel appel remplace l'entrée par une toute nouvelle commande — c'est
 * ce qui permet à un chercheur de reprendre un prestataire déjà utilisé
 * (#266, voir `server/api/conversations/[id]/rebook.post.ts`).
 */
export function createEscrowOrder(input: {
  conversationId: string
  clientId: string
  providerId: string
  amount: number
}): EscrowOrder {
  const existing = ordersByConversationId.get(input.conversationId)
  if (existing && !TERMINAL_STATUSES_ALLOWING_REBOOK.includes(existing.status)) return existing

  const order: EscrowOrder = {
    id: randomUUID(),
    conversationId: input.conversationId,
    clientId: input.clientId,
    providerId: input.providerId,
    amount: input.amount,
    status: 'awaiting_payment',
    createdAt: Date.now(),
    paidAt: null,
    deliveredAt: null,
    releasedAt: null,
    cancelledAt: null,
    cancelReason: null,
    disputedAt: null,
    disputeReason: null,
    disputeEvidence: null,
    disputeResponse: null,
    disputeRespondedAt: null,
    checkInAt: null,
    checkInLocation: null,
    checkOutAt: null,
    checkOutLocation: null,
  }
  ordersByConversationId.set(input.conversationId, order)
  return order
}

/**
 * Effectue la libération des fonds : crédite le prestataire (net de
 * commission) et la plateforme (commission), puis marque la commande
 * `released`. Appelée aussi bien par la confirmation explicite du chercheur
 * que par la validation tacite après 72h — jamais deux fois pour la même
 * commande (le statut `delivered` requis n'existe plus une fois libérée).
 */
function releaseOrderFunds(order: EscrowOrder): void {
  const commission = Math.round(order.amount * ESCROW_COMMISSION_RATE)
  const providerNet = order.amount - commission

  if (providerNet > 0) {
    creditWallet({ walletUserId: order.providerId, type: 'escrow_release', amount: providerNet, reference: order.id, counterpartyUserId: order.clientId })
  }
  if (commission > 0) {
    creditWallet({ walletUserId: PLATFORM_WALLET_USER_ID, type: 'commission', amount: commission, reference: order.id, counterpartyUserId: order.providerId })
  }

  order.status = 'released'
  order.releasedAt = Date.now()

  // Validation finale (#264, anti-fuite) : les coordonnées réelles du
  // chercheur, masquées jusqu'ici dans le fil, ne sont révélées au
  // prestataire qu'une fois la prestation intégralement validée et payée.
  const contact = getClientContact(order.conversationId)
  if (contact) {
    addSystemMessage(
      order.conversationId,
      `Prestation validée : voici les coordonnées du chercheur pour la suite — ${contact}`,
    )
  }
}

/** Libère automatiquement une commande livrée depuis plus de 72h sans réponse du chercheur (#195). */
function applyTacitValidationIfExpired(order: EscrowOrder): void {
  if (order.status !== 'delivered' || order.deliveredAt === null) return
  if (Date.now() - order.deliveredAt >= TACIT_VALIDATION_DELAY_MS) {
    releaseOrderFunds(order)
  }
}

/**
 * Prochain prestataire disponible du même secteur/ville qu'un prestataire
 * donné (#289), classé par note effective décroissante (`getEffectiveRating`,
 * cohérent avec la note affichée ailleurs dans l'app plutôt qu'une note brute
 * d'annuaire). `null` si aucune alternative n'existe.
 */
function findNextAvailableProvider(currentProviderId: string): ProviderSearchResult | null {
  const current = getProviderById(currentProviderId)
  if (!current) return null

  const alternatives = searchProviders({ sector: current.sector, city: current.city }).filter(
    (provider) => provider.id !== currentProviderId,
  )
  if (alternatives.length === 0) return null

  const ranked = alternatives
    .map((provider) => ({ provider, ...getEffectiveRating(provider.id) }))
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
  return ranked[0]?.provider ?? null
}

/**
 * Réattribution automatique (#289) : si le prestataire n'a pas confirmé la
 * prise en charge (`order_confirmation` toujours non résolu) dans le délai
 * imparti après paiement, la commande en cours est remboursée et une
 * nouvelle demande est proposée au prestataire suivant du classement, sur
 * une nouvelle conversation. Le chercheur garde la main : la nouvelle
 * commande reste `awaiting_payment`, à confirmer par un nouveau paiement
 * (pas de débit automatique une seconde fois).
 */
function applyAutoReassignmentIfExpired(order: EscrowOrder): void {
  if (order.status !== 'in_escrow' || order.paidAt === null) return
  if (Date.now() - order.paidAt < PROVIDER_RESPONSE_TIMEOUT_MS) return

  const pendingConfirmation = findLatestUnresolvedMessage(order.conversationId, 'order_confirmation')
  if (!pendingConfirmation) return

  const nextProvider = findNextAvailableProvider(order.providerId)
  if (!nextProvider) {
    addSystemMessage(
      order.conversationId,
      "Le prestataire n'a pas répondu à temps et aucune alternative n'est disponible pour le moment. Vous pouvez annuler cette commande ou réessayer plus tard.",
    )
    return
  }

  creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: order.amount, reference: order.id, counterpartyUserId: order.providerId })
  order.status = 'refunded'
  order.cancelledAt = Date.now()
  order.cancelReason = "Réattribution automatique : le prestataire n'a pas confirmé la prise en charge à temps."
  resolveMessage(order.conversationId, pendingConfirmation.id)
  addSystemMessage(
    order.conversationId,
    `Le prestataire n'a pas répondu à temps. Remboursement intégral effectué, et votre demande a été transmise automatiquement à ${nextProvider.displayName}.`,
  )

  const newConversation = findOrCreateConversation(order.clientId, nextProvider.id)
  const clientContact = getClientContact(order.conversationId)
  if (clientContact) setClientContact(newConversation.id, clientContact)
  markFirstContactDone(newConversation.id)

  const newAmount = resolveProviderRate(nextProvider.id) ?? order.amount
  createEscrowOrder({ conversationId: newConversation.id, clientId: order.clientId, providerId: nextProvider.id, amount: newAmount })
  addSystemMessage(
    newConversation.id,
    "Cette demande vous a été transmise automatiquement suite à l'absence de réponse d'un autre prestataire. Réglez le paiement pour la confirmer.",
  )
}

export function getEscrowOrderByConversationId(conversationId: string): EscrowOrder | null {
  const order = ordersByConversationId.get(conversationId) ?? null
  if (order) {
    applyTacitValidationIfExpired(order)
    applyAutoReassignmentIfExpired(order)
  }
  return order
}

/**
 * Une prestation a-t-elle déjà été intégralement validée (`released`) entre
 * ce client et ce prestataire ? Sert de condition au démasquage des
 * coordonnées sur la fiche prestataire (#264, anti-fuite) — remplace l'ancien
 * critère « conversation existante », trop précoce (démasquait dès le
 * premier contact, avant tout paiement).
 */
export function hasReleasedOrderBetween(clientId: string, providerId: string): boolean {
  for (const order of ordersByConversationId.values()) {
    if (order.clientId !== clientId || order.providerId !== providerId) continue
    applyTacitValidationIfExpired(order)
    if (order.status === 'released') return true
  }
  return false
}

export type PayEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'already_paid' | 'insufficient_funds' }

/**
 * Débite le portefeuille du chercheur et met la commande en séquestre.
 * Ne renvoie jamais d'erreur générique : l'appelant (route API) sait
 * exactement quel code HTTP renvoyer selon le motif.
 */
export function payEscrowOrder(conversationId: string): PayEscrowOrderResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'awaiting_payment') return { ok: false, error: 'already_paid' }

  const movement = debitWallet({ walletUserId: order.clientId, amount: order.amount, reference: order.id, counterpartyUserId: order.providerId })
  if (!movement) return { ok: false, error: 'insufficient_funds' }

  order.status = 'in_escrow'
  order.paidAt = Date.now()
  return { ok: true, order }
}

export type MarkDeliveredResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'check_in_out_required' }

/** Formate l'échéance de validation tacite pour le message envoyé au chercheur (#273). */
function formatTacitValidationDeadline(deliveredAt: number): string {
  const deadline = new Date(deliveredAt + TACIT_VALIDATION_DELAY_MS)
  return deadline.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Le prestataire marque la prestation comme terminée (#195, « Marquer comme terminé »). */
export function markEscrowOrderDelivered(conversationId: string): MarkDeliveredResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (order.checkInAt === null || order.checkOutAt === null) return { ok: false, error: 'check_in_out_required' }

  order.status = 'delivered'
  order.deliveredAt = Date.now()

  // Notifie le chercheur du délai de validation tacite (#273) : sans
  // confirmation ni litige avant l'échéance, le paiement est libéré
  // automatiquement (voir applyTacitValidationIfExpired). Le message posté
  // dans le fil est vu comme non lu (#225) même si le chercheur ne consulte
  // pas la conversation dans l'immédiat.
  addSystemMessage(
    conversationId,
    `Le prestataire a marqué la prestation comme terminée. Vous avez jusqu'au ${formatTacitValidationDeadline(order.deliveredAt)} pour confirmer la réception ou signaler un problème ; passé ce délai, le paiement sera automatiquement libéré au prestataire.`,
  )

  return { ok: true, order }
}

export type ConfirmReceiptResult = { ok: true; order: EscrowOrder } | { ok: false; error: 'not_found' | 'invalid_status' }

/** Le chercheur confirme la réception/satisfaction (#195) : libère les fonds vers le prestataire. */
export function confirmEscrowOrderReceipt(conversationId: string): ConfirmReceiptResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'delivered') return { ok: false, error: 'invalid_status' }

  releaseOrderFunds(order)
  return { ok: true, order }
}

export type CancelEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le prestataire annule après le débit du chercheur (#196) : remboursement
 * intégral et automatique, aucune commission prélevée. Autorisé tant que la
 * commande est en séquestre ou livrée mais pas encore validée (`in_escrow`
 * ou `delivered`) — plus possible une fois les fonds libérés (`released`).
 * Le motif est obligatoire, à des fins de modération et de statistiques de
 * fiabilité du prestataire.
 */
export function cancelEscrowOrder(conversationId: string, reason: string): CancelEscrowOrderResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow' && order.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: order.amount, reference: order.id, counterpartyUserId: order.providerId })

  order.status = 'refunded'
  order.cancelledAt = Date.now()
  order.cancelReason = reason.trim()
  return { ok: true, order }
}

export type CancelByClientResult =
  | { ok: true; order: EscrowOrder; providerCompensation: number }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le chercheur annule après avoir payé, avant que la prestation soit
 * marquée terminée (#275, grille d'annulation symétrique — pendant de
 * `cancelEscrowOrder` côté prestataire). Autorisé uniquement tant que la
 * commande est en séquestre (`in_escrow`) : une fois `delivered`, le
 * désaccord relève du litige (`openEscrowDispute`), pas de l'annulation.
 */
export function cancelEscrowOrderByClient(conversationId: string, reason: string): CancelByClientResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  const isWithinGracePeriod = order.paidAt !== null && Date.now() - order.paidAt < CLIENT_CANCELLATION_GRACE_PERIOD_MS
  const providerCompensation = isWithinGracePeriod ? 0 : Math.round(order.amount * CLIENT_LATE_CANCELLATION_PENALTY_RATE)
  const clientRefund = order.amount - providerCompensation

  if (providerCompensation > 0) {
    creditWallet({
      walletUserId: order.providerId,
      type: 'cancellation_compensation',
      amount: providerCompensation,
      reference: order.id,
      counterpartyUserId: order.clientId,
    })
  }
  if (clientRefund > 0) {
    creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: clientRefund, reference: order.id, counterpartyUserId: order.providerId })
  }

  order.status = 'refunded'
  order.cancelledAt = Date.now()
  order.cancelReason = reason.trim()
  return { ok: true, order, providerCompensation }
}

export type OpenDisputeResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le chercheur conteste la qualité de la prestation au lieu de confirmer la
 * réception (#197/#274) : gèle les fonds (aucune libération ni remboursement
 * automatique) et notifie une équipe de médiation WorkTogo. Seule une
 * commande `delivered` (prestation marquée terminée par le prestataire, en
 * attente de validation) peut être contestée — passé ce point, le litige
 * relève de la médiation, pas de cette route. `evidence` (#274) accompagne
 * le motif de preuves à l'appui (description, liens vers des photos).
 */
export function openEscrowDispute(conversationId: string, reason: string, evidence?: string): OpenDisputeResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  order.status = 'disputed'
  order.disputedAt = Date.now()
  order.disputeReason = reason.trim()
  order.disputeEvidence = evidence?.trim() || null
  return { ok: true, order }
}

export type RespondToDisputeResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'response_required' }

/**
 * Le prestataire répond à un litige ouvert par le chercheur (#274) : la
 * commande reste `disputed` (les fonds restent gelés, aucun changement de
 * statut n'est déclenché par une simple réponse — seule l'équipe de
 * médiation WorkTogo peut la faire évoluer, hors périmètre technique de ce
 * lot). `disputeResponse` renseigné marque concrètement le passage en
 * « médiation » : chercheur et prestataire se sont tous deux exprimés,
 * l'équipe support dispose de tout le nécessaire pour arbitrer.
 */
export function respondToDispute(conversationId: string, response: string): RespondToDisputeResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'disputed') return { ok: false, error: 'invalid_status' }
  if (!response.trim()) return { ok: false, error: 'response_required' }

  order.disputeResponse = response.trim()
  order.disputeRespondedAt = Date.now()
  return { ok: true, order }
}

/** Commandes en litige en attente d'arbitrage, pour une future interface de médiation WorkTogo (#197/#274). */
export function listDisputedOrders(): EscrowOrder[] {
  return [...ordersByConversationId.values()].filter((order) => order.status === 'disputed')
}
