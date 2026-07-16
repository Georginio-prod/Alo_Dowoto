<script setup lang="ts">
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'

/**
 * Bandeau de statut du séquestre affiché au-dessus du fil de discussion une
 * fois le paiement confirmé (#195, epic #191) : bouton « Marquer comme
 * terminé » côté prestataire, « Confirmer la réception » côté chercheur,
 * ou message d'attente/de libération selon l'état.
 */
const props = defineProps<{
  escrowOrder: EscrowOrder
  conversationId: string
  isViewerClient: boolean
  isViewerProvider: boolean
}>()

const emit = defineEmits<{ changed: [] }>()

const isDelivering = ref(false)
const deliverError = ref('')

async function handleMarkDelivered() {
  if (isDelivering.value) return
  isDelivering.value = true
  deliverError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/deliver`, { method: 'POST' })
    emit('changed')
  } catch {
    deliverError.value = "Cette action n'a pas pu être effectuée. Réessayez."
  } finally {
    isDelivering.value = false
  }
}

const isConfirmingReceipt = ref(false)
const receiptError = ref('')

async function handleConfirmReceipt() {
  if (isConfirmingReceipt.value) return
  isConfirmingReceipt.value = true
  receiptError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/receive`, { method: 'POST' })
    emit('changed')
  } catch {
    receiptError.value = "Cette action n'a pas pu être effectuée. Réessayez."
  } finally {
    isConfirmingReceipt.value = false
  }
}

// Annulation prestataire et remboursement automatique (#196, epic #191) :
// autorisée tant que les fonds ne sont pas encore libérés (in_escrow ou
// delivered), motif obligatoire à des fins de modération.
const canCancel = computed(
  () => props.isViewerProvider && (props.escrowOrder.status === 'in_escrow' || props.escrowOrder.status === 'delivered'),
)
const showCancelForm = ref(false)
const cancelReason = ref('')
const isCancelling = ref(false)
const cancelError = ref('')

async function handleCancelOrder() {
  if (isCancelling.value || !cancelReason.value.trim()) return
  isCancelling.value = true
  cancelError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/cancel`, {
      method: 'POST',
      body: { reason: cancelReason.value.trim() },
    })
    showCancelForm.value = false
    emit('changed')
  } catch {
    cancelError.value = "L'annulation n'a pas pu être effectuée. Réessayez."
  } finally {
    isCancelling.value = false
  }
}

// Litige (#197, epic #191) : le chercheur conteste la qualité de la
// prestation au lieu de confirmer la réception, gèle les fonds en attendant
// une équipe de médiation WorkTogo.
const showDisputeForm = ref(false)
const disputeReason = ref('')
const isDisputing = ref(false)
const disputeError = ref('')

async function handleOpenDispute() {
  if (isDisputing.value || !disputeReason.value.trim()) return
  isDisputing.value = true
  disputeError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/dispute`, {
      method: 'POST',
      body: { reason: disputeReason.value.trim() },
    })
    showDisputeForm.value = false
    emit('changed')
  } catch {
    disputeError.value = "Le litige n'a pas pu être ouvert. Réessayez."
  } finally {
    isDisputing.value = false
  }
}
</script>

<template>
  <div class="mb-3 shrink-0 rounded-card border border-hairline bg-surface p-4">
    <p v-if="escrowOrder.status === 'in_escrow' && isViewerProvider" class="text-[13px] text-dark">
      Paiement reçu en séquestre ({{ escrowOrder.amount.toLocaleString('fr-FR') }} F CFA). Une fois la prestation
      terminée, marquez-la comme telle pour déclencher la validation du chercheur.
    </p>
    <button
      v-if="escrowOrder.status === 'in_escrow' && isViewerProvider"
      type="button"
      class="press mt-2 rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isDelivering"
      @click="handleMarkDelivered"
    >
      {{ isDelivering ? 'Envoi…' : 'Marquer comme terminé' }}
    </button>

    <p v-else-if="escrowOrder.status === 'in_escrow' && isViewerClient" class="text-[13px] text-muted">
      Paiement en séquestre ({{ escrowOrder.amount.toLocaleString('fr-FR') }} F CFA). Les fonds seront libérés une
      fois la prestation terminée et votre confirmation de réception.
    </p>

    <template v-else-if="escrowOrder.status === 'delivered' && isViewerClient">
      <p class="text-[13px] text-dark">
        Le prestataire a marqué la prestation comme terminée. Confirmez la réception pour libérer le paiement, ou
        contestez la qualité de la prestation (validation automatique sous 72h sans réponse).
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isConfirmingReceipt"
          @click="handleConfirmReceipt"
        >
          {{ isConfirmingReceipt ? 'Confirmation…' : 'Confirmer la réception' }}
        </button>
        <button
          v-if="!showDisputeForm"
          type="button"
          class="press rounded-field border border-error px-4 py-2 text-[13px] font-semibold text-error"
          @click="showDisputeForm = true"
        >
          Contester la prestation
        </button>
      </div>

      <div v-if="showDisputeForm" class="mt-3 space-y-2 border-t border-hairline pt-3">
        <textarea
          v-model="disputeReason"
          rows="2"
          placeholder="Motif du litige (obligatoire)"
          aria-label="Motif du litige"
          class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
        />
        <div class="flex gap-2">
          <button
            type="button"
            class="press rounded-field border border-error px-4 py-2 text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!disputeReason.trim() || isDisputing"
            @click="handleOpenDispute"
          >
            {{ isDisputing ? 'Envoi…' : 'Confirmer le litige' }}
          </button>
          <button type="button" class="press text-[12.5px] text-muted" @click="showDisputeForm = false">
            Retour
          </button>
        </div>
        <p v-if="disputeError" class="text-[12.5px] text-error">{{ disputeError }}</p>
      </div>
    </template>

    <p v-else-if="escrowOrder.status === 'delivered' && isViewerProvider" class="text-[13px] text-muted">
      En attente de confirmation du chercheur (validation automatique sous 72h sans réponse).
    </p>

    <p v-else-if="escrowOrder.status === 'released'" class="text-[13px] text-dark">
      Prestation terminée, paiement libéré{{ isViewerProvider ? ' vers votre solde WorkTogo' : '' }}.
    </p>

    <p v-else-if="escrowOrder.status === 'refunded'" class="text-[13px] text-dark">
      Commande annulée par le prestataire, chercheur remboursé intégralement.
    </p>

    <p v-else-if="escrowOrder.status === 'disputed'" class="text-[13px] text-dark">
      Litige ouvert : les fonds restent gelés en séquestre en attendant l'arbitrage de l'équipe de médiation
      WorkTogo.
    </p>

    <p v-if="deliverError" class="mt-2 text-[12.5px] text-error">{{ deliverError }}</p>
    <p v-if="receiptError" class="mt-2 text-[12.5px] text-error">{{ receiptError }}</p>

    <div v-if="canCancel" class="mt-3 border-t border-hairline pt-3">
      <button
        v-if="!showCancelForm"
        type="button"
        class="press text-[12.5px] font-semibold text-error underline"
        @click="showCancelForm = true"
      >
        Annuler la commande
      </button>

      <div v-else class="space-y-2">
        <textarea
          v-model="cancelReason"
          rows="2"
          placeholder="Motif de l'annulation (obligatoire)"
          aria-label="Motif de l'annulation"
          class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
        />
        <div class="flex gap-2">
          <button
            type="button"
            class="press rounded-field border border-error px-4 py-2 text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!cancelReason.trim() || isCancelling"
            @click="handleCancelOrder"
          >
            {{ isCancelling ? 'Annulation…' : 'Confirmer l\'annulation et rembourser' }}
          </button>
          <button type="button" class="press text-[12.5px] text-muted" @click="showCancelForm = false">
            Retour
          </button>
        </div>
        <p v-if="cancelError" class="text-[12.5px] text-error">{{ cancelError }}</p>
      </div>
    </div>
  </div>
</template>
