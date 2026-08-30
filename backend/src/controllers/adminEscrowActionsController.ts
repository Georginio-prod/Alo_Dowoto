import type { Request, Response } from 'express'
import { badRequest, conflict, notFound } from '../utils/apiError'
import { adminArbitrateDispute } from '../services/escrowDisputeResolutionService'
import { cancelEscrowOrder } from '../services/escrowOrderService'

/**
 * Dashboard admin (#admin) — sous-lot 3 : actions MUTANTES sur le séquestre.
 * Portées iso depuis `server/api/admin/escrow/[conversationId]/{arbitrate,refund}.post.ts`
 * (ADR-0017). Réutilisent les primitives atomiques/idempotentes de résolution de
 * litige et d'annulation (#366) déjà portées — aucune logique financière dupliquée.
 */

/** POST /api/admin/escrow/:conversationId/arbitrate — tranche un litige (escrow.manage). */
export async function adminArbitrate(req: Request, res: Response): Promise<void> {
  const conversationId = req.params.conversationId
  if (!conversationId) badRequest('Identifiant de commande manquant.')

  const body = req.body as { outcome?: unknown }
  const outcome = body?.outcome
  if (outcome !== 'provider' && outcome !== 'client') {
    badRequest("Le verdict doit être 'provider' (verser au prestataire) ou 'client' (rembourser le chercheur).")
  }

  const result = await adminArbitrateDispute(conversationId, outcome)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Commande introuvable.')
    conflict('Seul un litige ouvert (statut « en litige ») peut être arbitré.')
  }

  res.json({ ok: true, order: result.order })
}

/** POST /api/admin/escrow/:conversationId/refund — rembourse une commande sous séquestre au chercheur (escrow.manage). */
export async function adminEscrowRefund(req: Request, res: Response): Promise<void> {
  const conversationId = req.params.conversationId
  if (!conversationId) badRequest('Identifiant de commande manquant.')

  const body = req.body as { reason?: unknown }
  const reason = typeof body?.reason === 'string' && body.reason.trim()
    ? body.reason.trim()
    : 'Remboursement décidé par un administrateur.'

  const result = await cancelEscrowOrder(conversationId, reason)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Commande introuvable.')
    if (result.error === 'invalid_status') {
      conflict('Seule une commande sous séquestre (non encore versée ni remboursée) peut être remboursée ici.')
    }
    badRequest('Motif de remboursement requis.')
  }

  res.json({ ok: true, order: result.order })
}
