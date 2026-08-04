import type { EscrowOrder as PrismaEscrowOrder, Prisma } from '@prisma/client'
import { addSystemMessage, getClientContact } from '~~/server/utils/conversationStore'
import { applyAutoReassignmentIfExpired } from '~~/server/utils/escrowAutoReassignment'
import { applyDisputeResolutionTimeoutIfExpired } from '~~/server/utils/escrowDisputeResolution'
import { notifyDisputeUpdate } from '~~/server/utils/notificationStore'
import { prisma } from '~~/server/utils/prisma'
import { creditWallet, debitWallet, PLATFORM_WALLET_USER_ID } from '~~/server/utils/walletStore'

/**
 * Commandes en séquestre (#194/#195, brique du paiement séquestre — epic #191),
 * persistées en base (Prisma/SQLite, #342, ADR 0013). Les commandes survivent
 * désormais aux redémarrages du serveur.
 *
 * Une commande est créée en même temps que la prise de premier contact (#129)
 * est soumise, avec le tarif fixe du prestataire. Tant qu'elle n'est pas payée,
 * le prestataire ne doit voir ni le message ni le détail de la demande.
 *
 * Cycle de vie : awaiting_payment → in_escrow (#194) → delivered → released
 * (#195, double validation) ; le prestataire peut aussi annuler après le débit
 * (in_escrow ou delivered) → refunded (#196). `delivered` déclenche un délai de
 * validation tacite (`TACIT_VALIDATION_DELAY_MS`) : si le chercheur ne confirme
 * ni ne conteste dans ce délai, la commande est libérée automatiquement à la
 * prochaine lecture (voir `applyTacitValidationIfExpired`). Le chercheur peut
 * aussi ouvrir un litige (#197) : `delivered` → `disputed`, ce qui gèle les
 * fonds en attendant l'arbitrage d'une équipe de médiation WorkTogo.
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
  /** Réponse du prestataire au litige (#274, « en médiation »). */
  disputeResponse: string | null
  disputeRespondedAt: number | null
  /**
   * Preuve d'intervention in-app (#268, anti-fuite) : le prestataire enregistre
   * son arrivée puis son départ. La géolocalisation est enregistrée quand le
   * navigateur l'autorise, mais n'est pas exigée — c'est l'existence des deux
   * horodatages qui constitue la preuve requise avant de marquer terminé.
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
 * Délai maximal laissé au prestataire pour confirmer la prise en charge après
 * paiement (#289) : passé ce délai sans réponse, la demande est automatiquement
 * réattribuée au prestataire suivant du même secteur/ville.
 */
export const PROVIDER_RESPONSE_TIMEOUT_MS = 30 * 60 * 1000

function toOrder(row: PrismaEscrowOrder): EscrowOrder {
  return {
    id: row.id,
    conversationId: row.conversationId,
    clientId: row.clientId,
    providerId: row.providerId,
    amount: row.amount,
    status: row.status as EscrowOrderStatus,
    createdAt: row.createdAt.getTime(),
    paidAt: row.paidAt?.getTime() ?? null,
    deliveredAt: row.deliveredAt?.getTime() ?? null,
    releasedAt: row.releasedAt?.getTime() ?? null,
    cancelledAt: row.cancelledAt?.getTime() ?? null,
    cancelReason: row.cancelReason,
    disputedAt: row.disputedAt?.getTime() ?? null,
    disputeReason: row.disputeReason,
    disputeEvidence: row.disputeEvidence,
    disputeResponse: row.disputeResponse,
    disputeRespondedAt: row.disputeRespondedAt?.getTime() ?? null,
    checkInAt: row.checkInAt?.getTime() ?? null,
    checkInLocation: row.checkInLat !== null && row.checkInLng !== null ? { lat: row.checkInLat, lng: row.checkInLng } : null,
    checkOutAt: row.checkOutAt?.getTime() ?? null,
    checkOutLocation: row.checkOutLat !== null && row.checkOutLng !== null ? { lat: row.checkOutLat, lng: row.checkOutLng } : null,
  }
}

async function updateOrder(id: string, data: Prisma.EscrowOrderUpdateInput, tx?: Prisma.TransactionClient): Promise<EscrowOrder> {
  const db = tx ?? prisma
  return toOrder(await db.escrowOrder.update({ where: { id }, data }))
}

/** Accès direct (sans les vérifications paresseuses de `getEscrowOrderByConversationId`) pour les modules extraits de ce fichier, ex. `escrowClientCancellation.ts`. */
export async function getRawEscrowOrder(conversationId: string): Promise<EscrowOrder | null> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  return row ? toOrder(row) : null
}

/** La commande existante bloque-t-elle toute nouvelle demande sur cette conversation ? Seules `released`/`refunded` sont terminales et permettent une reprise (#266). */
const TERMINAL_STATUSES_ALLOWING_REBOOK: readonly EscrowOrderStatus[] = ['released', 'refunded']

/** Horodatages de création des commandes de ce chercheur, tous statuts confondus — sert à détecter un rythme de création anormal (#277, `evaluateOrderRisk`). */
export async function getRecentOrderTimestampsForClient(clientId: string): Promise<number[]> {
  const rows = await prisma.escrowOrder.findMany({ where: { clientId }, select: { createdAt: true } })
  return rows.map((row) => row.createdAt.getTime())
}

/**
 * Nombre maximal de demandes non payées qu'un chercheur peut avoir ouvertes
 * simultanément (#280) : frein supplémentaire contre les demandes « pour voir »,
 * sans intention réelle de payer.
 */
export const MAX_SIMULTANEOUS_UNPAID_ORDERS = 2

/** Nombre de commandes en attente de paiement (`awaiting_payment`) pour ce chercheur, tous prestataires confondus (#280). */
export async function countUnpaidOrdersForClient(clientId: string): Promise<number> {
  return prisma.escrowOrder.count({ where: { clientId, status: 'awaiting_payment' } })
}

/**
 * Idempotent tant que la commande existante est active (`awaiting_payment` à
 * `disputed`) : une conversation n'a jamais plus d'une commande active à la
 * fois. Une fois la commande précédente terminale (`released`/`refunded`), un
 * nouvel appel la remplace par une toute nouvelle commande — ce qui permet à un
 * chercheur de reprendre un prestataire déjà utilisé (#266).
 */
export async function createEscrowOrder(input: {
  conversationId: string
  clientId: string
  providerId: string
  amount: number
}): Promise<EscrowOrder> {
  const existing = await prisma.escrowOrder.findUnique({ where: { conversationId: input.conversationId } })
  if (existing && !TERMINAL_STATUSES_ALLOWING_REBOOK.includes(existing.status as EscrowOrderStatus)) {
    return toOrder(existing)
  }
  // Conversation unique en base : une commande terminale est remplacée (même
  // sémantique que l'ancien `Map.set`, qui écrasait l'entrée précédente).
  if (existing) await prisma.escrowOrder.delete({ where: { id: existing.id } })

  const row = await prisma.escrowOrder.create({
    data: {
      conversationId: input.conversationId,
      clientId: input.clientId,
      providerId: input.providerId,
      amount: input.amount,
      status: 'awaiting_payment',
    },
  })
  return toOrder(row)
}

/**
 * Effectue la libération des fonds : crédite le prestataire (net de commission)
 * et la plateforme (commission), puis marque la commande `released`. Appelée
 * aussi bien par la confirmation explicite du chercheur que par la validation
 * tacite après 72h — jamais deux fois pour la même commande.
 */
export async function releaseOrderFunds(order: EscrowOrder): Promise<EscrowOrder> {
  const commission = Math.round(order.amount * ESCROW_COMMISSION_RATE)
  const providerNet = order.amount - commission

  // Atomicité (#366, audit C1 cas 2) : crédit prestataire + crédit plateforme +
  // passage `released` dans une seule transaction. La relecture du statut dans
  // la transaction sert de garde d'idempotence : `applyTacitValidationIfExpired`
  // peut ré-appeler cette fonction à la lecture d'une commande `delivered`
  // expirée ; si un premier appel concurrent a déjà libéré, on ne re-crédite pas.
  const { updated, released } = await prisma.$transaction(async (tx) => {
    const fresh = await tx.escrowOrder.findUnique({ where: { id: order.id } })
    if (!fresh || fresh.status === 'released' || fresh.status === 'refunded') {
      return { updated: fresh ? toOrder(fresh) : order, released: false }
    }
    if (providerNet > 0) {
      await creditWallet({ walletUserId: order.providerId, type: 'escrow_release', amount: providerNet, reference: order.id, counterpartyUserId: order.clientId }, tx)
    }
    if (commission > 0) {
      await creditWallet({ walletUserId: PLATFORM_WALLET_USER_ID, type: 'commission', amount: commission, reference: order.id, counterpartyUserId: order.providerId }, tx)
    }
    const row = await updateOrder(order.id, { status: 'released', releasedAt: new Date(Date.now()) }, tx)
    return { updated: row, released: true }
  })

  // Validation finale (#264, anti-fuite) : les coordonnées réelles du chercheur,
  // masquées jusqu'ici dans le fil, ne sont révélées au prestataire qu'une fois
  // la prestation intégralement validée et payée. Émis hors transaction (message
  // non monétaire) et une seule fois, quand la libération a réellement eu lieu.
  if (released) {
    const contact = await getClientContact(order.conversationId)
    if (contact) {
      const body = `Prestation validée : voici les coordonnées du chercheur pour la suite — ${contact}`
      await addSystemMessage(order.conversationId, body, 'text', { key: 'systemMessages.contactRevealed', params: { contact } })
    }
  }
  return updated
}

/** Libère automatiquement une commande livrée depuis plus de 72h sans réponse du chercheur (#195). */
async function applyTacitValidationIfExpired(order: EscrowOrder): Promise<EscrowOrder> {
  if (order.status !== 'delivered' || order.deliveredAt === null) return order
  if (Date.now() - order.deliveredAt >= TACIT_VALIDATION_DELAY_MS) {
    return releaseOrderFunds(order)
  }
  return order
}

export async function getEscrowOrderByConversationId(conversationId: string): Promise<EscrowOrder | null> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  if (!row) return null
  let order = toOrder(row)
  order = await applyTacitValidationIfExpired(order)
  order = await applyAutoReassignmentIfExpired(order)
  order = await applyDisputeResolutionTimeoutIfExpired(order)
  return order
}

/**
 * Une prestation a-t-elle déjà été intégralement validée (`released`) entre ce
 * client et ce prestataire ? Sert de condition au démasquage des coordonnées
 * sur la fiche prestataire (#264, anti-fuite).
 */
export async function hasReleasedOrderBetween(clientId: string, providerId: string): Promise<boolean> {
  const rows = await prisma.escrowOrder.findMany({ where: { clientId, providerId } })
  for (const row of rows) {
    const order = await applyTacitValidationIfExpired(toOrder(row))
    if (order.status === 'released') return true
  }
  return false
}

export type PayEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'already_paid' | 'insufficient_funds' }

/**
 * Débite le portefeuille du chercheur et met la commande en séquestre. Ne
 * renvoie jamais d'erreur générique : l'appelant (route API) sait exactement
 * quel code HTTP renvoyer selon le motif.
 */
export async function payEscrowOrder(conversationId: string): Promise<PayEscrowOrderResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'awaiting_payment') return { ok: false, error: 'already_paid' }

  // Atomicité (#366, audit C1 cas 1) : le débit du chercheur et le passage
  // `in_escrow` sont dans une seule transaction. La relecture du statut *dans*
  // la transaction est la vraie garde d'idempotence : si le process était mort
  // entre débit et changement de statut, un réessai relit `in_escrow` et
  // renvoie `already_paid` au lieu de re-débiter le chercheur.
  const result = await prisma.$transaction(async (tx): Promise<
    { kind: 'ok'; order: EscrowOrder } | { kind: 'already_paid' } | { kind: 'insufficient_funds' }
  > => {
    const fresh = await tx.escrowOrder.findUnique({ where: { id: row.id } })
    if (!fresh || fresh.status !== 'awaiting_payment') return { kind: 'already_paid' }
    const movement = await debitWallet({ walletUserId: fresh.clientId, amount: fresh.amount, reference: fresh.id, counterpartyUserId: fresh.providerId }, tx)
    if (!movement) return { kind: 'insufficient_funds' }
    const order = await updateOrder(fresh.id, { status: 'in_escrow', paidAt: new Date(Date.now()) }, tx)
    return { kind: 'ok', order }
  })

  if (result.kind === 'already_paid') return { ok: false, error: 'already_paid' }
  if (result.kind === 'insufficient_funds') return { ok: false, error: 'insufficient_funds' }

  // Premier paiement réel du filleul (#365, programme de parrainage) : ce
  // paiement en séquestre peut être ce tout premier paiement. Sans effet si
  // le client n'a pas été parrainé, ou si son parrainage a déjà été
  // récompensé (idempotent, voir referralStore.ts). Hors transaction argent :
  // effet secondaire non bloquant, ne doit pas faire échouer le paiement.
  await rewardReferralIfPending(row.clientId)

  return { ok: true, order: result.order }
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
export async function markEscrowOrderDelivered(conversationId: string): Promise<MarkDeliveredResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (row.checkInAt === null || row.checkOutAt === null) return { ok: false, error: 'check_in_out_required' }

  const deliveredAt = Date.now()
  const order = await updateOrder(row.id, { status: 'delivered', deliveredAt: new Date(deliveredAt) })

  // Notifie le chercheur du délai de validation tacite (#273). `deadline`
  // (#i18n) : horodatage brut transmis en paramètre, formaté selon la locale
  // de chaque lecteur côté client plutôt que figé en 'fr-FR' dans le texte.
  const deadline = deliveredAt + TACIT_VALIDATION_DELAY_MS
  const warningBody = `Le prestataire a marqué la prestation comme terminée. Vous avez jusqu'au ${formatTacitValidationDeadline(deliveredAt)} pour confirmer la réception ou signaler un problème ; passé ce délai, le paiement sera automatiquement libéré au prestataire.`
  await addSystemMessage(conversationId, warningBody, 'text', { key: 'systemMessages.tacitValidationWarning', params: { deadline } })

  return { ok: true, order }
}

export type ConfirmReceiptResult = { ok: true; order: EscrowOrder } | { ok: false; error: 'not_found' | 'invalid_status' }

/** Le chercheur confirme la réception/satisfaction (#195) : libère les fonds vers le prestataire. */
export async function confirmEscrowOrderReceipt(conversationId: string): Promise<ConfirmReceiptResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'delivered') return { ok: false, error: 'invalid_status' }

  const order = await releaseOrderFunds(toOrder(row))
  return { ok: true, order }
}

export type CancelEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le prestataire annule après le débit du chercheur (#196) : remboursement
 * intégral et automatique, aucune commission prélevée. Autorisé tant que la
 * commande est en séquestre ou livrée mais pas encore validée. Motif obligatoire.
 */
export async function cancelEscrowOrder(conversationId: string, reason: string): Promise<CancelEscrowOrderResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'in_escrow' && row.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  // Atomicité (#366) : remboursement du chercheur + passage `refunded` tout ou
  // rien. La relecture du statut dans la transaction empêche un double
  // remboursement si deux annulations arrivent en concurrence.
  const order = await prisma.$transaction(async (tx) => {
    const fresh = await tx.escrowOrder.findUnique({ where: { id: row.id } })
    if (!fresh || (fresh.status !== 'in_escrow' && fresh.status !== 'delivered')) return null
    await creditWallet({ walletUserId: fresh.clientId, type: 'escrow_refund', amount: fresh.amount, reference: fresh.id, counterpartyUserId: fresh.providerId }, tx)
    return updateOrder(fresh.id, { status: 'refunded', cancelledAt: new Date(Date.now()), cancelReason: reason.trim() }, tx)
  })
  if (!order) return { ok: false, error: 'invalid_status' }
  return { ok: true, order }
}

export type OpenDisputeResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le chercheur conteste la qualité de la prestation au lieu de confirmer la
 * réception (#197/#274) : gèle les fonds et notifie une équipe de médiation
 * WorkTogo. Seule une commande `delivered` peut être contestée. `evidence`
 * (#274) accompagne le motif de preuves à l'appui.
 */
export async function openEscrowDispute(conversationId: string, reason: string, evidence?: string): Promise<OpenDisputeResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  const order = await updateOrder(row.id, {
    status: 'disputed',
    disputedAt: new Date(Date.now()),
    disputeReason: reason.trim(),
    disputeEvidence: evidence?.trim() || null,
  })
  return { ok: true, order }
}

export type RespondToDisputeResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'response_required' }

/**
 * Le prestataire répond à un litige ouvert par le chercheur (#274) : la commande
 * reste `disputed` (les fonds restent gelés). `disputeResponse` renseigné marque
 * concrètement le passage en « médiation ».
 */
export async function respondToDispute(conversationId: string, response: string): Promise<RespondToDisputeResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { conversationId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'disputed') return { ok: false, error: 'invalid_status' }
  if (!response.trim()) return { ok: false, error: 'response_required' }

  const order = await updateOrder(row.id, { disputeResponse: response.trim(), disputeRespondedAt: new Date(Date.now()) })

  // Le chercheur doit maintenant confirmer ou contester cette réponse (#274,
  // panneau de médiation) — voir escrowDisputeResolution.ts.
  await notifyDisputeUpdate({
    recipientId: order.clientId,
    conversationId: order.conversationId,
    title: 'Réponse du prestataire à votre litige',
    body: "Le prestataire indique que la prestation est terminée. Merci de confirmer si c'est bien le cas.",
  })

  return { ok: true, order }
}

/** Commandes en litige en attente d'arbitrage, pour une future interface de médiation WorkTogo (#197/#274). */
export async function listDisputedOrders(): Promise<EscrowOrder[]> {
  const rows = await prisma.escrowOrder.findMany({ where: { status: 'disputed' } })
  return rows.map(toOrder)
}

export type AdminReassignResult = { ok: true, order: EscrowOrder } | { ok: false, error: 'not_found' | 'invalid_status' }

/**
 * Réassigne une commande bloquée à un autre prestataire (#dashboard-admin,
 * module Missions) — réservé aux commandes pas encore livrées (`awaiting_payment`/
 * `in_escrow`) : une fois `delivered`/`released`/`disputed`, la prestation a
 * déjà eu lieu, la réassignation n'a plus de sens.
 */
export async function adminReassignOrder(orderId: string, newProviderId: string): Promise<AdminReassignResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { id: orderId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'awaiting_payment' && row.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  const updated = await updateOrder(orderId, { providerId: newProviderId })
  return { ok: true, order: updated }
}

/** Force la validation (libération des fonds) d'une commande bloquée, quel que soit le délai tacite habituel (#dashboard-admin, module Missions). */
export async function adminForceValidate(orderId: string): Promise<{ ok: true, order: EscrowOrder } | { ok: false, error: 'not_found' | 'invalid_status' }> {
  const row = await prisma.escrowOrder.findUnique({ where: { id: orderId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'in_escrow' && row.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  const order = await releaseOrderFunds(toOrder(row))
  return { ok: true, order }
}
